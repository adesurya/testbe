// src/controllers/userStatsController.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class UserStatsController {
    constructor() {
        // Bind all methods to this
        this.getUserStats = this.getUserStats.bind(this);
        this.updateProfile = this.updateProfile.bind(this);
        this.updatePassword = this.updatePassword.bind(this);
    }

    async getUserStats(req, res) {
        const connection = await pool.getConnection();
        try {
            const userId = req.user.id;

            // Get active sessions count
            const [activeSessions] = await connection.query(
                `SELECT COUNT(*) as active_sessions 
                 FROM whatsapp_sessions 
                 WHERE user_id = ? AND status = 'active'`,
                [userId]
            );

            // Get single message statistics
            const [messageStats] = await connection.query(
                `SELECT 
                    COUNT(*) as total_messages,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful_messages,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages
                 FROM messages 
                 WHERE user_id = ?`,
                [userId]
            );

            // Get bulk message statistics
            const [bulkStats] = await connection.query(
                `SELECT 
                    COUNT(DISTINCT mb.id) as total_bulk_campaigns,
                    COUNT(bm.id) as total_bulk_messages,
                    SUM(CASE WHEN bm.status = 'sent' THEN 1 ELSE 0 END) as successful_bulk_messages,
                    SUM(CASE WHEN bm.status = 'failed' THEN 1 ELSE 0 END) as failed_bulk_messages,
                    MAX(mb.created_at) as last_bulk_campaign_date
                 FROM message_bulks mb
                 LEFT JOIN bulk_messages bm ON mb.id = bm.bulk_id
                 WHERE mb.user_id = ?`,
                [userId]
            );

            // Get 5 recent single messages
            const [recentMessages] = await connection.query(
                `SELECT m.*, ws.phone_number as sender_number
                 FROM messages m
                 LEFT JOIN whatsapp_sessions ws ON m.whatsapp_session_id = ws.id
                 WHERE m.user_id = ?
                 ORDER BY m.created_at DESC
                 LIMIT 5`,
                [userId]
            );

            // Get 5 recent bulk campaigns
            const [recentBulkCampaigns] = await connection.query(
                `SELECT 
                    mb.id,
                    mb.created_at,
                    mb.status,
                    mb.total_messages,
                    COUNT(bm.id) as total_sent,
                    mb.message as campaign_message,
                    CASE 
                        WHEN mb.message_type = 'button' THEN 'Button Message'
                        ELSE 'Regular Message'
                    END as message_type,
                    mb.button_data
                FROM message_bulks mb
                LEFT JOIN bulk_messages bm ON mb.id = bm.bulk_id AND bm.status = 'sent'
                WHERE mb.user_id = ?
                GROUP BY mb.id
                ORDER BY mb.created_at DESC
                LIMIT 5`,
                [userId]
            );



            // Get current plan info
            const [planInfo] = await connection.query(
                `SELECT up.*, p.name as plan_name
                 FROM user_plans up
                 JOIN plans p ON up.plan_id = p.id
                 WHERE up.user_id = ? 
                 AND up.status = 'active'
                 ORDER BY up.end_date DESC
                 LIMIT 1`,
                [userId]
            );

            // Calculate total success rates
            const totalMessages = (messageStats[0].total_messages || 0) + (bulkStats[0].total_bulk_messages || 0);
            const successfulMessages = (messageStats[0].successful_messages || 0) + (bulkStats[0].successful_bulk_messages || 0);
            const failedMessages = (messageStats[0].failed_messages || 0) + (bulkStats[0].failed_bulk_messages || 0);

            res.json({
                success: true,
                data: {
                    sessions: {
                        active: activeSessions[0].active_sessions
                    },
                    messages: {
                        single: {
                            total: messageStats[0].total_messages || 0,
                            successful: messageStats[0].successful_messages || 0,
                            failed: messageStats[0].failed_messages || 0,
                            success_rate: messageStats[0].total_messages ? 
                                ((messageStats[0].successful_messages / messageStats[0].total_messages) * 100).toFixed(2) + '%' 
                                : '0%'
                        },
                        bulk: {
                            campaigns: bulkStats[0].total_bulk_campaigns || 0,
                            total_messages: bulkStats[0].total_bulk_messages || 0,
                            successful: bulkStats[0].successful_bulk_messages || 0,
                            failed: bulkStats[0].failed_bulk_messages || 0,
                            success_rate: bulkStats[0].total_bulk_messages ? 
                                ((bulkStats[0].successful_bulk_messages / bulkStats[0].total_bulk_messages) * 100).toFixed(2) + '%'
                                : '0%',
                            last_campaign_date: bulkStats[0].last_bulk_campaign_date
                        },
                        overall: {
                            total: totalMessages,
                            successful: successfulMessages,
                            failed: failedMessages,
                            success_rate: totalMessages ? 
                                ((successfulMessages / totalMessages) * 100).toFixed(2) + '%'
                                : '0%'
                        }
                    },
                    current_plan: planInfo[0] ? {
                        name: planInfo[0].plan_name,
                        messages_remaining: planInfo[0].messages_remaining,
                        end_date: planInfo[0].end_date
                    } : null,
                    recent_activity: {
                        single_messages: recentMessages.map(msg => ({
                            id: msg.id,
                            target_number: msg.target_number,
                            sender_number: msg.sender_number,
                            status: msg.status,
                            created_at: msg.created_at
                        })),
                        bulk_campaigns: recentBulkCampaigns.map(campaign => ({
                            id: campaign.id,
                            message_type: campaign.message_type,
                            total_messages: campaign.total_messages,
                            sent_messages: campaign.total_sent,
                            status: campaign.status,
                            created_at: campaign.created_at,
                            preview_message: campaign.campaign_message.substring(0, 50) + '...'
                        }))
                    }
                }
            });
        } catch (error) {
            console.error('Error getting user stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    async updateProfile(req, res) {
        const connection = await pool.getConnection();
        try {
            const userId = req.user.id;
            const { username, email } = req.body;

            // Validate input
            if (!username && !email) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one field (username or email) must be provided'
                });
            }

            // Build update query
            const updateFields = [];
            const updateValues = [];
            
            if (username) {
                updateFields.push('username = ?');
                updateValues.push(username);
            }
            if (email) {
                updateFields.push('email = ?');
                updateValues.push(email);
            }

            updateValues.push(userId);

            // Update user
            await connection.query(
                `UPDATE users 
                 SET ${updateFields.join(', ')}, 
                     updated_at = NOW()
                 WHERE id = ?`,
                updateValues
            );

            res.json({
                success: true,
                message: 'Profile updated successfully'
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    async updatePassword(req, res) {
        const connection = await pool.getConnection();
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;

            // Validate input
            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password and new password are required'
                });
            }

            // Get current user
            const [users] = await connection.query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );

            if (!users.length) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, users[0].password);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password
            await connection.query(
                `UPDATE users 
                 SET password = ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [hashedPassword, userId]
            );

            res.json({
                success: true,
                message: 'Password updated successfully'
            });
        } catch (error) {
            console.error('Error updating password:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        } finally {
            connection.release();
        }
    }
}

// Create a single instance and export it
const userStatsController = new UserStatsController();
module.exports = userStatsController;