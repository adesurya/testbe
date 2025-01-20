// src/models/Metrics.js
const pool = require('../config/database');

class Metrics {
    static async recordMessageSent(userId, sessionId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Update metrics table
            await connection.query(
                `INSERT INTO metrics 
                (user_id, whatsapp_session_id, message_count, success_count) 
                VALUES (?, ?, 1, 1)
                ON DUPLICATE KEY UPDATE 
                message_count = message_count + 1,
                success_count = success_count + 1,
                updated_at = CURRENT_TIMESTAMP`,
                [userId, sessionId]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async recordMessageFailed(userId, sessionId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Update metrics table
            await connection.query(
                `INSERT INTO metrics 
                (user_id, whatsapp_session_id, message_count, failed_count) 
                VALUES (?, ?, 1, 1)
                ON DUPLICATE KEY UPDATE 
                message_count = message_count + 1,
                failed_count = failed_count + 1,
                updated_at = CURRENT_TIMESTAMP`,
                [userId, sessionId]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getUserMetrics(userId) {
        const connection = await pool.getConnection();
        try {
            const [metrics] = await connection.query(
                `SELECT 
                    m.*,
                    ws.phone_number,
                    up.messages_remaining
                FROM metrics m
                JOIN whatsapp_sessions ws ON m.whatsapp_session_id = ws.id
                LEFT JOIN user_plans up ON up.user_id = m.user_id AND up.status = 'active'
                WHERE m.user_id = ?`,
                [userId]
            );
            return metrics;
        } finally {
            connection.release();
        }
    }
}

module.exports = Metrics;