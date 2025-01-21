// src/models/WhatsappSession.js
const pool = require('../config/database');

class WhatsappSession {
    static async create(userId, phoneNumber) {
        const connection = await pool.getConnection();
        try {
            // Check if session already exists
            const [existing] = await connection.query(
                'SELECT * FROM whatsapp_sessions WHERE phone_number = ?',
                [phoneNumber]
            );

            if (existing.length > 0) {
                // Update existing session
                await connection.query(
                    'UPDATE whatsapp_sessions SET user_id = ?, status = "inactive", updated_at = NOW() WHERE phone_number = ?',
                    [userId, phoneNumber]
                );
                return existing[0].id;
            }

            // Create new session
            const [result] = await connection.query(
                'INSERT INTO whatsapp_sessions (user_id, phone_number, status) VALUES (?, ?, "inactive")',
                [userId, phoneNumber]
            );
            
            console.log('WhatsApp session created:', { userId, phoneNumber, insertId: result.insertId });
            return result.insertId;
        } finally {
            connection.release();
        }
    }

    static async getAllActiveSessions() {
        const connection = await pool.getConnection();
        try {
            const [sessions] = await connection.query(
                `SELECT ws.*, u.username as owner_username
                 FROM whatsapp_sessions ws
                 JOIN users u ON ws.user_id = u.id
                 WHERE ws.status = 'active' AND ws.is_shared = true`
            );
            return sessions;
        } finally {
            connection.release();
        }
    }

    static async findSessionsForUser(userId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT ws.*, u.username as owner_username
                 FROM whatsapp_sessions ws
                 JOIN users u ON ws.user_id = u.id
                 WHERE (ws.user_id = ? OR ws.is_shared = true)
                 AND ws.status = 'active'`,
                [userId]
            );
            return rows;
        } finally {
            connection.release();
        }
    }

    static async updateSharedStatus(sessionId, isShared) {
        const connection = await pool.getConnection();
        try {
            await connection.query(
                'UPDATE whatsapp_sessions SET is_shared = ? WHERE id = ?',
                [isShared, sessionId]
            );
            return true;
        } finally {
            connection.release();
        }
    }

    static async updateStatus(phoneNumber, status) {
        const connection = await pool.getConnection();
        try {
            await connection.query(
                'UPDATE whatsapp_sessions SET status = ?, last_used = CURRENT_TIMESTAMP WHERE phone_number = ?',
                [status, phoneNumber]
            );
            console.log('WhatsApp session status updated:', { phoneNumber, status });
        } finally {
            connection.release();
        }
    }

    static async findActiveSessions(userId) {
        const connection = await pool.getConnection();
        try {
            console.log('Finding active sessions for user:', userId);
            
            const [rows] = await connection.query(
                'SELECT * FROM whatsapp_sessions WHERE user_id = ? AND status = "active"',
                [userId]
            );
            
            console.log('Found sessions:', rows);
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getSessionById(sessionId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT * FROM whatsapp_sessions WHERE id = ?',
                [sessionId]
            );
            return rows[0];
        } finally {
            connection.release();
        }
    }

    static async getAllSessions() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(`
                SELECT 
                    ws.*,
                    u.username,
                    u.email,
                    COUNT(m.id) as total_messages,
                    SUM(CASE WHEN m.status = 'sent' THEN 1 ELSE 0 END) as sent_messages,
                    SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END) as failed_messages
                FROM whatsapp_sessions ws
                JOIN users u ON ws.user_id = u.id
                LEFT JOIN messages m ON ws.id = m.whatsapp_session_id
                GROUP BY ws.id
                ORDER BY ws.created_at DESC
            `);
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getSessionsByUser(userId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(`
                SELECT 
                    ws.*,
                    COUNT(m.id) as total_messages,
                    SUM(CASE WHEN m.status = 'sent' THEN 1 ELSE 0 END) as sent_messages,
                    SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END) as failed_messages
                FROM whatsapp_sessions ws
                LEFT JOIN messages m ON ws.id = m.whatsapp_session_id
                WHERE ws.user_id = ?
                GROUP BY ws.id
                ORDER BY ws.created_at DESC
            `, [userId]);
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getMetrics() {
        const connection = await pool.getConnection();
        try {
            // General metrics
            const [generalMetrics] = await connection.query(`
                SELECT
                    COUNT(DISTINCT ws.id) as total_sessions,
                    COUNT(DISTINCT CASE WHEN ws.status = 'active' THEN ws.id END) as active_sessions,
                    COUNT(DISTINCT ws.user_id) as total_users,
                    COUNT(m.id) as total_messages,
                    SUM(CASE WHEN m.status = 'sent' THEN 1 ELSE 0 END) as sent_messages,
                    SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END) as failed_messages
                FROM whatsapp_sessions ws
                LEFT JOIN messages m ON ws.id = m.whatsapp_session_id
            `);

            // User metrics
            const [userMetrics] = await connection.query(`
                SELECT 
                    u.username,
                    COUNT(DISTINCT ws.id) as total_sessions,
                    COUNT(DISTINCT CASE WHEN ws.status = 'active' THEN ws.id END) as active_sessions,
                    COUNT(m.id) as total_messages,
                    SUM(CASE WHEN m.status = 'sent' THEN 1 ELSE 0 END) as sent_messages
                FROM users u
                LEFT JOIN whatsapp_sessions ws ON u.id = ws.user_id
                LEFT JOIN messages m ON ws.id = m.whatsapp_session_id
                WHERE u.role = 'user'
                GROUP BY u.id
                ORDER BY total_messages DESC
            `);

            // Daily message stats for last 30 days
            const [dailyStats] = await connection.query(`
                SELECT 
                    DATE(m.created_at) as date,
                    COUNT(*) as total_messages,
                    SUM(CASE WHEN m.status = 'sent' THEN 1 ELSE 0 END) as sent_messages
                FROM messages m
                WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(m.created_at)
                ORDER BY date DESC
            `);

            return {
                general: generalMetrics[0],
                userMetrics,
                dailyStats
            };
        } finally {
            connection.release();
        }
    }

    static async getActiveSessionsByUser(userId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT * FROM whatsapp_sessions WHERE user_id = ? AND status = "active"',
                [userId]
            );
            return rows;
        } finally {
            connection.release();
        }
    }

    static async deactivateSession(sessionId) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                'UPDATE whatsapp_sessions SET status = "inactive" WHERE id = ?',
                [sessionId]
            );

            if (result.affectedRows === 0) {
                throw new Error('Session not found');
            }

            return true;
        } finally {
            connection.release();
        }
    }

    static async getSessionStats() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(`
                SELECT 
                    ws.user_id,
                    u.username,
                    COUNT(*) as total_sessions,
                    SUM(CASE WHEN ws.status = 'active' THEN 1 ELSE 0 END) as active_sessions,
                    MAX(ws.last_used) as last_activity
                FROM whatsapp_sessions ws
                JOIN users u ON ws.user_id = u.id
                GROUP BY ws.user_id, u.username
            `);
            return rows;
        } finally {
            connection.release();
        }
    }

}

module.exports = WhatsappSession;