// src/controllers/messageController.js
const Message = require('../models/Message');
const WhatsappService = require('../services/whatsappService');
const WhatsappSession = require('../models/WhatsappSession');
const pool = require('../config/database');
const Metrics = require('../models/Metrics');


class MessageController {

    constructor() {
        this.checkUserPlan = this.checkUserPlan.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.sendBulkMessages = this.sendBulkMessages.bind(this);
        this.getBulkStatus = this.getBulkStatus.bind(this);
        this.processBulkMessages = this.processBulkMessages.bind(this);
        this.getFormats = this.getFormats.bind(this);

    }


    async getActiveWhatsappSessions(userId) {
        const connection = await pool.getConnection();
        try {
            console.log('Getting WhatsApp sessions for user:', userId);

            // Get all active sessions for the user
            const [sessions] = await connection.query(
                `SELECT ws.*, u.username
                 FROM whatsapp_sessions ws
                 JOIN users u ON ws.user_id = u.id
                 WHERE ws.user_id = ? 
                 AND ws.status = 'active'`,
                [userId]
            );

            console.log('Database sessions:', sessions);
            return sessions;
        } catch (error) {
            console.error('Error getting WhatsApp sessions:', error);
            throw error;
        } finally {
            connection.release();
        }
    }


    async checkUserPlan(userId) {
        const connection = await pool.getConnection();
        try {
            const [plans] = await connection.query(
                `SELECT * FROM user_plans 
                 WHERE user_id = ? 
                 AND status = 'active' 
                 AND messages_remaining > 0
                 AND NOW() < end_date`,
                [userId]
            );

            console.log('Active plan found:', plans[0]);
            return plans[0];
        } finally {
            connection.release();
        }
    }

    async sendMessage(req, res) {
        const connection = await pool.getConnection();
        try {
            const { targetNumber, message, imagePath, delay } = req.body;
            const userId = req.user.id;
    
            console.log('Checking plan for user:', userId);
            const activePlan = await this.checkUserPlan(userId);
            if (!activePlan) {
                return res.status(400).json({
                    error: 'No active plan or insufficient messages remaining'
                });
            }
    
            console.log('Getting active WhatsApp sessions');
            const activeSessions = await WhatsappService.getAllActiveSessions(userId);
            if (!activeSessions || activeSessions.length === 0) {
                return res.status(400).json({
                    error: 'No active WhatsApp sessions'
                });
            }
    
            // Select random session
            const session = activeSessions[Math.floor(Math.random() * activeSessions.length)];
            console.log('Selected session:', session.phone_number);
    
            // Create message record first
            const messageId = await Message.create({
                userId: userId,
                whatsappSessionId: session.id,
                targetNumber: targetNumber,
                message: message,
                imagePath: imagePath,
                status: 'pending'
            });
    
            console.log('Created message record:', messageId);
    
            try {
                await WhatsappService.sendMessage(
                    session.phone_number,
                    targetNumber,
                    message,
                    imagePath,
                    delay || 0
                );
    
                // Update message status to sent
                await Message.updateStatus(messageId, 'sent');
                console.log('Message sent successfully, status updated');
    
                // Record success metrics
                await Metrics.recordMessageSent(userId, session.id);
    
                res.json({
                    message: 'Message sent successfully',
                    messageId: messageId,
                    sessionUsed: session.phone_number,
                    messagesRemaining: activePlan.messages_remaining - 1
                });
            } catch (error) {
                // Update message status to failed
                await Message.updateStatus(messageId, 'failed');
                console.log('Message failed, status updated');
    
                // Record failed metrics
                await Metrics.recordMessageFailed(userId, session.id);
                throw error;
            }
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    }

    async getMessageStatus(req, res) {
        try {
            const { messageId } = req.params;
            const connection = await pool.getConnection();

            try {
                const [messages] = await connection.query(
                    `SELECT m.*, ws.phone_number as sender_number 
                     FROM messages m 
                     LEFT JOIN whatsapp_sessions ws ON m.whatsapp_session_id = ws.id 
                     WHERE m.id = ?`,
                    [messageId]
                );

                if (!messages || messages.length === 0) {
                    return res.status(404).json({ error: 'Message not found' });
                }

                const message = messages[0];
                res.json({
                    messageId: Number(messageId),
                    status: message.status,
                    targetNumber: message.target_number,
                    senderNumber: message.sender_number,
                    createdAt: message.created_at,
                    updatedAt: message.updated_at
                });
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error in getMessageStatus:', error);
            res.status(500).json({ error: error.message });
        }
    }


    async getUserMessages(req, res) {
        try {
            const { userId } = req.params;
            const connection = await pool.getConnection();

            try {
                const [messages] = await connection.query(
                    `SELECT 
                        m.id,
                        m.message,
                        m.target_number,
                        m.status,
                        m.created_at,
                        m.updated_at,
                        ws.phone_number as sender_number
                     FROM messages m 
                     LEFT JOIN whatsapp_sessions ws ON m.whatsapp_session_id = ws.id 
                     WHERE m.user_id = ?
                     ORDER BY m.created_at DESC`,
                    [userId]
                );

                res.json({
                    userId,
                    totalMessages: messages.length,
                    messages: messages.map(msg => ({
                        id: msg.id,
                        message: msg.message,
                        targetNumber: msg.target_number,
                        senderNumber: msg.sender_number,
                        status: msg.status,
                        createdAt: msg.created_at,
                        updatedAt: msg.updated_at
                    }))
                });
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error in getUserMessages:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async sendBulkMessages(req, res) {
        try {
            const { targetNumbers, message, imagePath, baseDelay = 30, intervalDelay = 10 } = req.body;
            const userId = req.user.id;

            console.log('Checking plan for bulk messages. User:', userId);
            const activePlan = await this.checkUserPlan(userId);
            if (!activePlan) {
                return res.status(400).json({
                    error: 'No active plan or insufficient messages remaining'
                });
            }

            if (!targetNumbers || !Array.isArray(targetNumbers) || targetNumbers.length === 0) {
                return res.status(400).json({
                    error: 'targetNumbers must be a non-empty array'
                });
            }

            if (targetNumbers.length > activePlan.messages_remaining) {
                return res.status(400).json({
                    error: 'Insufficient messages remaining in plan'
                });
            }

            const activeSessions = await WhatsappService.getAllActiveSessions(userId);
            console.log(`Found ${activeSessions.length} active sessions for user ${userId}`);

            if (!activeSessions || activeSessions.length === 0) {
                return res.status(400).json({
                    error: 'No active WhatsApp sessions available'
                });
            }

            // Create bulk messages record
            const bulkResult = await Message.createBulkMessages({
                userId,
                targetNumbers,
                message,
                imagePath,
                totalMessages: targetNumbers.length
            });

            // Start async processing
            this.processBulkMessages({
                bulkId: bulkResult.bulkId,
                targetNumbers,
                message,
                imagePath,
                baseDelay,
                intervalDelay,
                activeSessions,
                userId
            });

            res.json({
                message: 'Bulk messages queued for sending',
                bulkId: bulkResult.bulkId,
                totalMessages: targetNumbers.length,
                activeSessionsCount: activeSessions.length,
                estimatedTimeMinutes: Math.ceil((targetNumbers.length * (baseDelay + intervalDelay/2)) / 60)
            });

        } catch (error) {
            console.error('Error in sendBulkMessages:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async processBulkMessages(params) {
        const {
            bulkId,
            targetNumbers,
            message,
            imagePath,
            baseDelay,
            intervalDelay,
            activeSessions,
            userId
        } = params;
    
        console.log(`Starting bulk message process for ${targetNumbers.length} numbers`);
        let currentSessionIndex = 0;
        let failedNumbers = [];
    
        const formattedMessage = MessageFormatter.formatMessage(message);


        for (let i = 0; i < targetNumbers.length; i++) {
            const targetNumber = targetNumbers[i];
            let sent = false;
            let attempts = 0;
            const maxAttempts = activeSessions.length;
    
            while (!sent && attempts < maxAttempts) {
                const session = activeSessions[currentSessionIndex];
                
                try {
                    console.log(`Attempt ${attempts + 1} for ${targetNumber} using session ${session.phone_number}`);
                    
                    // Calculate current delay for this message
                    const messageDelay = baseDelay + Math.floor(Math.random() * intervalDelay);
                    console.log(`Waiting ${messageDelay} seconds before sending`);
                    
                    // Add delay
                    await new Promise(resolve => setTimeout(resolve, messageDelay * 1000));
                    
                    // Send message
                    await WhatsappService.sendMessage(
                        session.phone_number,
                        targetNumber,
                        formattedMessage,
                        imagePath,
                        0 // No additional delay needed here
                    );
    
                    // Update message status and details
                    await Message.updateBulkMessageStatus(bulkId, targetNumber, 'sent', session.id, message, imagePath);
                    sent = true;
                    console.log(`Successfully sent to ${targetNumber}`);
    
                    // Record metrics
                    await Metrics.recordMessageSent(userId, session.id);
    
                } catch (error) {
                    console.error(`Failed to send to ${targetNumber} using session ${session.phone_number}:`, error);
                    attempts++;
                    await Metrics.recordMessageFailed(userId, session.id);
                    
                    // Try next session
                    currentSessionIndex = (currentSessionIndex + 1) % activeSessions.length;
                    
                    // If all sessions failed for this number
                    if (attempts === maxAttempts) {
                        failedNumbers.push(targetNumber);
                        await Message.updateBulkMessageStatus(bulkId, targetNumber, 'failed', null, message, imagePath);
                        console.log(`All attempts failed for ${targetNumber}`);
                    }
                }
            }
    
            // Rotate to next session for next number
            currentSessionIndex = (currentSessionIndex + 1) % activeSessions.length;
        }
    
        // Update final bulk status
        console.log(`Bulk message process completed. Failed numbers: ${failedNumbers.length}`);
        await Message.updateBulkStatus(bulkId, {
            failedNumbers,
            completedAt: new Date()
        });
    }
    
    async getBulkStatus(req, res) {
        try {
            const { bulkId } = req.params;
            const status = await Message.getBulkStatus(bulkId);
            res.json(status);
        } catch (error) {
            console.error('Error getting bulk status:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getBulkHistory(req, res) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
    
            const connection = await pool.getConnection();
            try {
                // Get total count
                const [countResult] = await connection.query(
                    'SELECT COUNT(*) as total FROM message_bulks WHERE user_id = ?',
                    [userId]
                );
                const total = countResult[0].total;
    
                // Get paginated results
                const [bulks] = await connection.query(
                    `SELECT 
                        mb.*,
                        COUNT(bm.id) as total_messages,
                        SUM(CASE WHEN bm.status = 'sent' THEN 1 ELSE 0 END) as sent_messages,
                        SUM(CASE WHEN bm.status = 'failed' THEN 1 ELSE 0 END) as failed_messages
                    FROM message_bulks mb
                    LEFT JOIN bulk_messages bm ON mb.id = bm.bulk_id
                    WHERE mb.user_id = ?
                    GROUP BY mb.id
                    ORDER BY mb.created_at DESC
                    LIMIT ? OFFSET ?`,
                    [userId, limit, offset]
                );
    
                const totalPages = Math.ceil(total / limit);
    
                res.json({
                    data: bulks.map(bulk => ({
                        id: bulk.id,
                        status: bulk.status,
                        totalMessages: bulk.total_messages,
                        sentMessages: bulk.sent_messages,
                        failedMessages: bulk.failed_messages,
                        createdAt: bulk.created_at,
                        completedAt: bulk.completed_at,
                        message: bulk.message.substring(0, 50) + '...' // Preview message
                    })),
                    pagination: {
                        total,
                        pages: totalPages,
                        current: page,
                        limit
                    }
                });
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error getting bulk history:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getMessageHistory(req, res) {
        const connection = await pool.getConnection();
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const [messages] = await connection.query(
                `SELECT 
                    m.*,
                    ws.phone_number as sender_number
                FROM messages m
                LEFT JOIN whatsapp_sessions ws ON m.whatsapp_session_id = ws.id
                WHERE m.user_id = ?
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?`,
                [userId, limit, offset]
            );

            const [countResult] = await connection.query(
                'SELECT COUNT(*) as total FROM messages WHERE user_id = ?',
                [userId]
            );

            res.json({
                status: "success",
                data: messages,
                pagination: {
                    total: countResult[0].total,
                    pages: Math.ceil(countResult[0].total / limit),
                    current: page,
                    limit: limit
                }
            });
        } catch (error) {
            console.error('Error getting message history:', error);
            res.status(500).json({
                status: "error",
                message: error.message
            });
        } finally {
            connection.release();
        }
    }
    async getFormats(req, res) {
        try {
            const formats = [
                {
                    formatType: 'bold',
                    syntax: '**text**',
                    example: '**Important Message**',
                    result: '*Important Message*'
                },
                {
                    formatType: 'italic',
                    syntax: '__text__',
                    example: '__Special Note__',
                    result: '_Special Note_'
                },
                {
                    formatType: 'strikethrough',
                    syntax: '~~text~~',
                    example: '~~Old Price~~',
                    result: '~Old Price~'
                },
                {
                    formatType: 'monospace',
                    syntax: '```text```',
                    example: '```Code Block```',
                    result: '```Code Block```'
                },
                {
                    formatType: 'emoji',
                    syntax: ':emoji_name:',
                    example: ':smile: :heart: :check:',
                    result: '😊 ❤️ ✅'
                }
            ];

            const examples = {
                'Simple Announcement': '**PENGUMUMAN** :megaphone:\n__Pesan Penting__',
                'Promo Message': '**PROMO SPESIAL** :fire:\n~~Rp 100.000~~ → **Rp 50.000** :star:',
                'Status Update': 'Status: **Selesai** :check:\n__Updated: 12:00__ :clock:',
                'Complex Format': '**INFORMASI PENTING** :warning:\n__Harap Dibaca__ :info:\n\n1. Point 1 :check:\n2. Point 2 :star:\n\n```Contact: Admin```'
            };

            const emojiList = {
                'Basic': {
                    ':smile:': '😊',
                    ':heart:': '❤️',
                    ':check:': '✅',
                    ':x:': '❌'
                },
                'Status': {
                    ':warning:': '⚠️',
                    ':info:': 'ℹ️',
                    ':star:': '⭐',
                    ':fire:': '🔥'
                },
                'Objects': {
                    ':clock:': '🕐',
                    ':phone:': '📱',
                    ':mail:': '📧',
                    ':calendar:': '📅'
                },
                'Expressions': {
                    ':laugh:': '😂',
                    ':wink:': '😉',
                    ':cool:': '😎',
                    ':love:': '😍'
                }
            };

            res.json({
                formats,
                examples,
                emojiList,
                notes: [
                    "Format dapat dikombinasikan dalam satu pesan",
                    "Emoji dapat digunakan di tengah teks berformat",
                    "Gunakan newline (\\n) untuk membuat baris baru",
                    "Format berlaku untuk single message dan bulk message"
                ]
            });
        } catch (error) {
            console.error('Error getting formats:', error);
            res.status(500).json({ error: error.message });
        }
    }
    
}
const messageController = new MessageController();

module.exports = new MessageController();