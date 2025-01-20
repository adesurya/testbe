// src/models/Message.js
const pool = require('../config/database');

class Message {
    static async create(messageData) {
        const connection = await pool.getConnection();
        try {
            console.log('Creating message record with data:', messageData);

            const [result] = await connection.query(
                `INSERT INTO messages 
                (user_id, whatsapp_session_id, target_number, message, image_path, status) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    messageData.userId,
                    messageData.whatsappSessionId,
                    messageData.targetNumber,
                    messageData.message,
                    messageData.imagePath || null,
                    messageData.status || 'pending'
                ]
            );

            console.log('Message record created with ID:', result.insertId);
            return result.insertId;
        } catch (error) {
            console.error('Error creating message record:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async createBulkMessages(bulkData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Create bulk record
            const [bulkResult] = await connection.query(
                `INSERT INTO message_bulks 
                (user_id, message, image_path, total_messages, status) 
                VALUES (?, ?, ?, ?, 'processing')`,
                [bulkData.userId, bulkData.message, bulkData.imagePath, bulkData.totalMessages]
            );

            const bulkId = bulkResult.insertId;

            // Create individual message records with more details
            const messageValues = bulkData.targetNumbers.map(number => [
                bulkId,
                bulkData.userId,
                number,
                bulkData.message,
                bulkData.imagePath,
                'pending',
                new Date(),
                new Date()
            ]);

            await connection.query(
                `INSERT INTO bulk_messages 
                (bulk_id, user_id, target_number, message, image_path, status, created_at, updated_at) 
                VALUES ?`,
                [messageValues]
            );

            await connection.commit();
            return { bulkId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getBulkStatus(bulkId) {
        const connection = await pool.getConnection();
        try {
            // Get bulk status
            const [bulkStatus] = await connection.query(
                `SELECT 
                    mb.*,
                    COUNT(bm.id) as total_messages,
                    SUM(CASE WHEN bm.status = 'sent' THEN 1 ELSE 0 END) as sent_messages,
                    SUM(CASE WHEN bm.status = 'failed' THEN 1 ELSE 0 END) as failed_messages,
                    SUM(CASE WHEN bm.status = 'pending' THEN 1 ELSE 0 END) as pending_messages
                FROM message_bulks mb
                LEFT JOIN bulk_messages bm ON mb.id = bm.bulk_id
                WHERE mb.id = ?
                GROUP BY mb.id`,
                [bulkId]
            );

            if (!bulkStatus || bulkStatus.length === 0) {
                throw new Error('Bulk message not found');
            }

            return {
                id: bulkId,
                status: bulkStatus[0].status,
                totalMessages: bulkStatus[0].total_messages,
                sentMessages: bulkStatus[0].sent_messages,
                failedMessages: bulkStatus[0].failed_messages,
                pendingMessages: bulkStatus[0].pending_messages,
                failedNumbers: JSON.parse(bulkStatus[0].failed_numbers || '[]'),
                createdAt: bulkStatus[0].created_at,
                completedAt: bulkStatus[0].completed_at
            };
        } finally {
            connection.release();
        }
    }

    static async updateBulkMessageStatus(bulkId, targetNumber, status, sessionId = null, message = null, imagePath = null) {
        const connection = await pool.getConnection();
        try {
            const updateFields = ['status = ?'];
            const updateValues = [status];

            if (sessionId) {
                updateFields.push('whatsapp_session_id = ?');
                updateValues.push(sessionId);
            }
            if (message) {
                updateFields.push('message = ?');
                updateValues.push(message);
            }
            if (imagePath !== undefined) {
                updateFields.push('image_path = ?');
                updateValues.push(imagePath);
            }

            updateValues.push(bulkId, targetNumber);

            await connection.query(
                `UPDATE bulk_messages 
                SET ${updateFields.join(', ')}, 
                updated_at = CURRENT_TIMESTAMP
                WHERE bulk_id = ? AND target_number = ?`,
                updateValues
            );
        } finally {
            connection.release();
        }
    }

    static async updateBulkStatus(bulkId, { failedNumbers, completedAt }) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Update status bulk message
            await connection.query(
                `UPDATE message_bulks 
                 SET 
                    status = CASE 
                        WHEN ? > 0 THEN 'partially_completed'
                        ELSE 'completed'
                    END,
                    failed_numbers = ?,
                    completed_at = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    failedNumbers.length,
                    JSON.stringify(failedNumbers),
                    completedAt,
                    bulkId
                ]
            );

            // Get statistics
            const [stats] = await connection.query(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
                FROM bulk_messages 
                WHERE bulk_id = ?`,
                [bulkId]
            );

            // Update summary statistics
            await connection.query(
                `UPDATE message_bulks 
                 SET 
                    total_sent = ?,
                    total_failed = ?
                 WHERE id = ?`,
                [stats[0].sent, stats[0].failed, bulkId]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }


    static async updateStatus(messageId, status) {
        const connection = await pool.getConnection();
        try {
            console.log(`Updating message ${messageId} status to ${status}`);

            const [result] = await connection.query(
                `UPDATE messages 
                 SET status = ?, 
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [status, messageId]
            );

            if (result.affectedRows === 0) {
                throw new Error(`Message with ID ${messageId} not found`);
            }

            console.log(`Message ${messageId} status updated to ${status}`);
            return true;
        } catch (error) {
            console.error('Error updating message status:', error);
            throw error;
        } finally {
            connection.release();
        }
    }


    static async getMessageById(messageId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT * FROM messages WHERE id = ?',
                [messageId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error getting message:', error);
            throw new Error(`Failed to get message: ${error.message}`);
        } finally {
            connection.release();
        }
    }

    static async getUserMessages(userId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT m.*, ws.phone_number as sender_number 
                 FROM messages m 
                 LEFT JOIN whatsapp_sessions ws ON m.whatsapp_session_id = ws.id 
                 WHERE m.user_id = ?
                 ORDER BY m.created_at DESC`,
                [userId]
            );
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getMessageDetails(messageId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT 
                    m.*,
                    ws.phone_number as sender_number,
                    u.username
                 FROM messages m
                 LEFT JOIN whatsapp_sessions ws ON m.whatsapp_session_id = ws.id
                 LEFT JOIN users u ON m.user_id = u.id
                 WHERE m.id = ?`,
                [messageId]
            );
            return rows[0];
        } finally {
            connection.release();
        }
    }
}

module.exports = Message;