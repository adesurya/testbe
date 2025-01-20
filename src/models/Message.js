// src/models/Message.js
const pool = require('../config/database');

class Message {
    static async create(messageData) {
        const connection = await pool.getConnection();
        try {
            // Langsung menggunakan whatsappSessionId yang sudah valid dari controller
            const [result] = await connection.query(
                `INSERT INTO messages 
                (user_id, whatsapp_session_id, target_number, message, image_path, delay) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    messageData.userId,
                    messageData.whatsappSessionId,  // Menggunakan sessionId langsung
                    messageData.targetNumber,
                    messageData.message,
                    messageData.imagePath || null,
                    messageData.delay || 0
                ]
            );
            
            console.log('Message created with ID:', result.insertId);
            return result.insertId;
        } catch (error) {
            console.error('Error creating message:', error);
            throw new Error(`Failed to create message: ${error.message}`);
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