// src/controllers/adminController.js

const pool = require('../config/database');
const WhatsappService = require('../services/whatsappService');

class AdminController {
    async getWhatsappSessions(req, res) {
        const connection = await pool.getConnection();
        try {
            const [sessions] = await connection.query(
                `SELECT ws.*, u.username as owner_username,
                    COUNT(DISTINCT m.id) as total_messages,
                    SUM(CASE WHEN m.status = 'sent' THEN 1 ELSE 0 END) as sent_messages,
                    SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END) as failed_messages
                FROM whatsapp_sessions ws
                LEFT JOIN users u ON ws.user_id = u.id
                LEFT JOIN messages m ON ws.id = m.whatsapp_session_id
                GROUP BY ws.id
                ORDER BY ws.created_at DESC`
            );

            res.json({
                success: true,
                data: sessions
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }

    async deleteWhatsappSession(req, res) {
        const connection = await pool.getConnection();
        try {
            const { sessionId } = req.params;
            
            // Get session details first
            const [session] = await connection.query(
                'SELECT * FROM whatsapp_sessions WHERE id = ?',
                [sessionId]
            );

            if (!session.length) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            // Disconnect WhatsApp client
            await WhatsappService.disconnectSession(session[0].phone_number);

            // Delete from database
            await connection.query(
                'DELETE FROM whatsapp_sessions WHERE id = ?',
                [sessionId]
            );

            res.json({
                success: true,
                message: 'WhatsApp session deleted successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }

    async getBulkMessages(req, res) {
        const connection = await pool.getConnection();
        try {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const [messages] = await connection.query(
                `SELECT bm.*, mb.message as bulk_message, 
                    u.username as sender_username,
                    ws.phone_number as sender_number
                FROM bulk_messages bm
                LEFT JOIN message_bulks mb ON bm.bulk_id = mb.id
                LEFT JOIN users u ON bm.user_id = u.id
                LEFT JOIN whatsapp_sessions ws ON bm.whatsapp_session_id = ws.id
                ORDER BY bm.created_at DESC
                LIMIT ? OFFSET ?`,
                [parseInt(limit), offset]
            );

            const [total] = await connection.query(
                'SELECT COUNT(*) as total FROM bulk_messages'
            );

            res.json({
                success: true,
                data: messages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total[0].total,
                    pages: Math.ceil(total[0].total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }

    async deleteBulkMessage(req, res) {
        const connection = await pool.getConnection();
        try {
            const { id } = req.params;

            await connection.query(
                'DELETE FROM bulk_messages WHERE id = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'Bulk message deleted successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }

    async getMessageBulks(req, res) {
        const connection = await pool.getConnection();
        try {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const [bulks] = await connection.query(
                `SELECT mb.*, u.username as sender_username,
                    COUNT(bm.id) as total_messages,
                    SUM(CASE WHEN bm.status = 'sent' THEN 1 ELSE 0 END) as sent_messages
                FROM message_bulks mb
                LEFT JOIN users u ON mb.user_id = u.id
                LEFT JOIN bulk_messages bm ON mb.id = bm.bulk_id
                GROUP BY mb.id
                ORDER BY mb.created_at DESC
                LIMIT ? OFFSET ?`,
                [parseInt(limit), offset]
            );

            const [total] = await connection.query(
                'SELECT COUNT(*) as total FROM message_bulks'
            );

            res.json({
                success: true,
                data: bulks,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total[0].total,
                    pages: Math.ceil(total[0].total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }

    async deleteMessageBulk(req, res) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { id } = req.params;

            // Delete associated bulk messages first
            await connection.query(
                'DELETE FROM bulk_messages WHERE bulk_id = ?',
                [id]
            );

            // Delete the bulk record
            await connection.query(
                'DELETE FROM message_bulks WHERE id = ?',
                [id]
            );

            await connection.commit();

            res.json({
                success: true,
                message: 'Message bulk and associated messages deleted successfully'
            });
        } catch (error) {
            await connection.rollback();
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }

    async getMessages(req, res) {
        const connection = await pool.getConnection();
        try {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const [messages] = await connection.query(
                `SELECT m.*, u.username as sender_username,
                    ws.phone_number as sender_number
                FROM messages m
                LEFT JOIN users u ON m.user_id = u.id
                LEFT JOIN whatsapp_sessions ws ON m.whatsapp_session_id = ws.id
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?`,
                [parseInt(limit), offset]
            );

            const [total] = await connection.query(
                'SELECT COUNT(*) as total FROM messages'
            );

            res.json({
                success: true,
                data: messages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total[0].total,
                    pages: Math.ceil(total[0].total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }

    async deleteMessage(req, res) {
        const connection = await pool.getConnection();
        try {
            const { id } = req.params;

            await connection.query(
                'DELETE FROM messages WHERE id = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'Message deleted successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }

    async getMetrics(req, res) {
        const connection = await pool.getConnection();
        try {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const [metrics] = await connection.query(
                `SELECT mt.*, u.username,
                    ws.phone_number as session_number
                FROM metrics mt
                LEFT JOIN users u ON mt.user_id = u.id
                LEFT JOIN whatsapp_sessions ws ON mt.whatsapp_session_id = ws.id
                ORDER BY mt.created_at DESC
                LIMIT ? OFFSET ?`,
                [parseInt(limit), offset]
            );

            const [total] = await connection.query(
                'SELECT COUNT(*) as total FROM metrics'
            );

            res.json({
                success: true,
                data: metrics,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total[0].total,
                    pages: Math.ceil(total[0].total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }

    async deleteMetric(req, res) {
        const connection = await pool.getConnection();
        try {
            const { id } = req.params;

            await connection.query(
                'DELETE FROM metrics WHERE id = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'Metric deleted successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }
}

module.exports = new AdminController();