// src/models/Message.js
const pool = require('../config/database');

class Message {
    static async create(messageData) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                `INSERT INTO messages 
                (user_id, whatsapp_session_id, message, image_path, target_number, status) 
                VALUES (?, ?, ?, ?, ?, 'pending')`,
                [
                    messageData.userId,
                    messageData.whatsappSessionId,
                    messageData.message,
                    messageData.imagePath || null,
                    messageData.targetNumber
                ]
            );
            return result.insertId;
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

            // Create individual message records
            const messageValues = bulkData.targetNumbers.map(number => [
                bulkId,
                bulkData.userId,
                number,
                bulkData.message,
                bulkData.imagePath,
                'pending'
            ]);

            await connection.query(
                `INSERT INTO bulk_messages 
                (bulk_id, user_id, target_number, message, image_path, status) 
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

    static async updateStatus(messageId, status) {
        const connection = await pool.getConnection();
        try {
            await connection.query(
                'UPDATE messages SET status = ? WHERE id = ?',
                [status, messageId]
            );
            console.log(`Message ${messageId} status updated to ${status}`);
        } catch (error) {
            console.error('Error updating message status:', error);
            throw new Error(`Failed to update message status: ${error.message}`);
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
        } catch (error) {
            console.error('Error getting user messages:', error);
            throw new Error(`Failed to get user messages: ${error.message}`);
        } finally {
            connection.release();
        }
    }
}

module.exports = Message;