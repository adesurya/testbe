// src/services/whatsappService.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const pool = require('../config/database');
const WhatsappSession = require('../models/WhatsappSession');
const fs = require('fs');
const path = require('path');
const MessageFormatter = require('./messageFormatter');
const util = require('util');
const Message = require('../models/Message'); 

const fsPromises = {
    readdir: util.promisify(fs.readdir),
    unlink: util.promisify(fs.unlink),
    rmdir: util.promisify(fs.rmdir),
    stat: util.promisify(fs.stat),
    access: util.promisify(fs.access)
};

class WhatsappService {
    constructor() {
        this.sessions = new Map();
        this.cleanupAuthFiles();  
        this.resetSessions();
        this.initializeExistingSessions();
        this.initializationPromises = new Map(); // Track ongoing initializations
        this.initialize();
    }

    convertEmojiCodes(message) {
        const emojiMap = {
            ':fire:': '🔥',
            ':smile:': '😊',
            ':heart:': '❤️',
            ':check:': '✅',
            ':x:': '❌',
            ':star:': '⭐',
            ':laugh:': '😂',
            ':wink:': '😉',
            ':cry:': '😢',
            ':angry:': '😠',
            ':cool:': '😎',
            ':love:': '😍',
            ':surprise:': '😮',
            ':thinking:': '🤔',
            ':clap:': '👏',
            ':pray:': '🙏',
            ':rocket:': '🚀',
            ':warning:': '⚠️',
            ':info:': 'ℹ️',
            ':phone:': '📱',
            ':mail:': '📧',
            ':calendar:': '📅',
            ':time:': '⌚',
            ':money:': '💰',
            ':ok:': '👌',
            ':new:': '🆕',
            ':free:': '🆓',
            'grin': '😁',
            'wink': '😉',
            'star_eyes': '🤩',
            'sweat_smile': '😅',
            'sleepy': '😴',
            'relieved': '😌',
            'neutral_face': '😐',
            'confused': '😕',
            'angry': '😠',
            'scream': '😱',
            'poop': '💩',
            'clown': '🤡',
            'alien': '👽',
            'ghost': '👻',
            'skull': '💀',
            'sun': '☀️',
            'moon': '🌙',
            'cloud': '☁️',
            'umbrella': '☂️',
            'coffee': '☕',
            'soccer_ball': '⚽',
            'basketball': '🏀',
            'football': '🏈',
            'trophy': '🏆',
            'medal': '🏅',
            'apple': '🍎',
            'banana': '🍌',
            'pizza': '🍕',
            'cake': '🍰'
        };

        let formattedMessage = message;
        for (const [code, emoji] of Object.entries(emojiMap)) {
            formattedMessage = formattedMessage.replace(new RegExp(code, 'g'), emoji);
        }

        return formattedMessage;
    }

    async safeRemoveDir(dirPath) {
        try {
            // Check if directory exists
            try {
                await fsPromises.access(dirPath, fs.constants.F_OK);
            } catch (err) {
                // Directory doesn't exist, just return
                return;
            }

            // Read directory contents
            const files = await fsPromises.readdir(dirPath);

            // Delete all files/subdirectories inside the directory
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fsPromises.stat(filePath);

                if (stats.isDirectory()) {
                    // Recursively remove subdirectories
                    await this.safeRemoveDir(filePath);
                } else {
                    // Remove files
                    try {
                        await fsPromises.unlink(filePath);
                    } catch (err) {
                        console.warn(`Warning: Could not delete file ${filePath}:`, err.message);
                    }
                }
            }

            // Remove the empty directory
            try {
                await fsPromises.rmdir(dirPath);
                console.log(`Successfully removed directory: ${dirPath}`);
            } catch (err) {
                console.warn(`Warning: Could not remove directory ${dirPath}:`, err.message);
            }
        } catch (error) {
            console.warn(`Warning: Error processing directory ${dirPath}:`, error.message);
        }
    }

    async initialize() {
        await this.resetSessions();
    }

    async cleanupAuthFiles() {
        try {
            const authPath = path.join(process.cwd(), '.wwebjs_auth_temp');
            const cachePath = path.join(process.cwd(), '.wwebjs_cache');

            console.log('Starting cleanup of auth and cache directories...');

            // Clean directories sequentially to avoid any race conditions
            await this.safeRemoveDir(authPath);
            await this.safeRemoveDir(cachePath);

            console.log('Auth and cache files cleaned up successfully');
        } catch (error) {
            console.error('Error during cleanupAuthFiles:', error);
        }
    }

    getSessionPath(phoneNumber) {
        return path.join(process.cwd(), '.wwebjs_auth_temp', `session-${phoneNumber}`);
    }

    getSessionPath(phoneNumber) {
        return path.join(process.cwd(), '.wwebjs_auth_temp', `session-${phoneNumber}`);
    }


    async resetSessions() {
        const connection = await pool.getConnection();
        try {
            await connection.query('UPDATE whatsapp_sessions SET status = "inactive"');
            console.log('Reset all sessions to inactive');
        } catch (error) {
            console.error('Error resetting sessions:', error);
        } finally {
            connection.release();
        }
    }



    async initializeExistingSessions() {
        try {
            const connection = await pool.getConnection();
            try {
                console.log('Initializing existing WhatsApp sessions...');
                const [sessions] = await connection.query(
                    'SELECT * FROM whatsapp_sessions WHERE status = "active"'
                );
                
                console.log(`Found ${sessions.length} active sessions in database`);
                
                for (const session of sessions) {
                    try {
                        console.log(`Initializing session for ${session.phone_number}`);
                        await this.initializeSession(session.user_id, session.phone_number);
                    } catch (error) {
                        console.error(`Failed to initialize session ${session.phone_number}:`, error);
                    }
                }
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error in initializeExistingSessions:', error);
        }
    }



    async initializeSession(userId, phoneNumber) {
        if (this.initializationPromises.has(phoneNumber)) {
            console.log(`Initialization already in progress for ${phoneNumber}`);
            return this.initializationPromises.get(phoneNumber);
        }

        console.log(`Starting WhatsApp session initialization for ${phoneNumber}`);

        const initPromise = new Promise(async (resolve, reject) => {
            try {
                const client = new Client({
                    puppeteer: {
                        headless: true,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-accelerated-2d-canvas',
                            '--no-first-run',
                            '--single-process',
                            '--disable-gpu',
                            '--no-zygote',
                            '--disable-web-security',
                            '--ignore-certificate-errors',
                            '--allow-running-insecure-content',
                            '--disable-features=IsolateOrigins,site-per-process'
                        ],
                        defaultViewport: null,
                        ignoreHTTPSErrors: true
                    },
                    authStrategy: new LocalAuth({
                        clientId: phoneNumber,
                        dataPath: path.join(process.cwd(), '.wwebjs_auth')
                    }),
                    restartOnAuthFail: true,
                    qrMaxRetries: 5,
                    takeoverTimeoutMs: 120000
                });

                let qrGenerated = false;

                client.on('qr', async (qr) => {
                    try {
                        console.log(`Generating QR code for ${phoneNumber}`);
                        const qrCode = await qrcode.toDataURL(qr);
                        if (!qrGenerated) {
                            qrGenerated = true;
                            resolve({ qrCode });
                        }
                    } catch (error) {
                        console.error(`Error generating QR code: ${error.message}`);
                        reject(error);
                    }
                });

                client.on('ready', async () => {
                    console.log(`WhatsApp client ready for ${phoneNumber}`);
                    try {
                        await this.updateSessionStatus(phoneNumber, 'active');
                        this.sessions.set(phoneNumber, client);
                    } catch (error) {
                        console.error(`Error updating session status: ${error.message}`);
                    }
                });

                client.on('authenticated', () => {
                    console.log(`WhatsApp client authenticated for ${phoneNumber}`);
                });

                client.on('auth_failure', async (error) => {
                    console.error(`Authentication failed for ${phoneNumber}:`, error);
                    await this.updateSessionStatus(phoneNumber, 'inactive');
                    this.sessions.delete(phoneNumber);
                    this.initializationPromises.delete(phoneNumber);
                    reject(new Error('Authentication failed'));
                });

                client.on('disconnected', async (reason) => {
                    console.log(`WhatsApp client disconnected for ${phoneNumber}. Reason:`, reason);
                    await this.updateSessionStatus(phoneNumber, 'inactive');
                    this.sessions.delete(phoneNumber);
                    this.initializationPromises.delete(phoneNumber);
                });

                client.on('loading_screen', (percent, message) => {
                    console.log(`Loading screen: ${percent}% - ${message}`);
                });

                client.on('change_state', state => {
                    console.log(`State changed to: ${state}`);
                });

                await client.initialize();
                console.log('WhatsApp client initialization completed');

            } catch (error) {
                console.error(`Error initializing session for ${phoneNumber}:`, error);
                this.initializationPromises.delete(phoneNumber);
                reject(error);
            }
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                this.initializationPromises.delete(phoneNumber);
                reject(new Error('Session initialization timeout'));
            }, 120000); // 120 seconds timeout
        });

        this.initializationPromises.set(phoneNumber,
            Promise.race([initPromise, timeoutPromise])
                .catch(error => {
                    this.initializationPromises.delete(phoneNumber);
                    throw error;
                })
        );

        return this.initializationPromises.get(phoneNumber);
    }


    async cleanupSession(phoneNumber) {
        try {
            console.log(`Starting cleanup for session ${phoneNumber}...`);
            
            // Cleanup client
            const client = this.sessions.get(phoneNumber);
            if (client) {
                try {
                    await client.destroy();
                    console.log(`Client destroyed for ${phoneNumber}`);
                } catch (err) {
                    console.warn(`Warning: Error destroying client for ${phoneNumber}:`, err.message);
                }
            }

            // Remove from maps
            this.sessions.delete(phoneNumber);
            this.initializationPromises.delete(phoneNumber);

            // Update database status
            await this.updateSessionStatus(phoneNumber, 'inactive');

            // Cleanup session directory
            const sessionPath = this.getSessionPath(phoneNumber);
            await this.safeRemoveDir(sessionPath);

            console.log(`Session cleanup completed for ${phoneNumber}`);
        } catch (error) {
            console.error(`Error cleaning up session for ${phoneNumber}:`, error);
        }
    }

    async destroySession(phoneNumber) {
        const client = this.sessions.get(phoneNumber);
        if (client) {
            try {
                await client.destroy();
                this.sessions.delete(phoneNumber);
                this.initializationPromises.delete(phoneNumber);
                await this.updateSessionStatus(phoneNumber, 'inactive');
                console.log(`Session destroyed for ${phoneNumber}`);
            } catch (error) {
                console.error(`Error destroying session for ${phoneNumber}:`, error);
            }
        }
    }
    
    async gracefulShutdown() {
        console.log('Starting graceful shutdown of WhatsApp service...');
        const shutdownPromises = [];

        // Destroy semua sesi yang aktif
        for (const [phoneNumber, client] of this.sessions.entries()) {
            shutdownPromises.push(this.destroySession(phoneNumber));
        }

        // Tunggu semua sesi selesai di-destroy
        await Promise.all(shutdownPromises);
        
        // Bersihkan file-file auth dan cache
        await this.cleanupAuthFiles();
        
        console.log('WhatsApp service shutdown completed');
    }

    async getAllActiveSessions(userId) {
        const connection = await pool.getConnection();
        try {
            console.log(`Getting active sessions for user ${userId}`);
            console.log('Type of userId:', typeof userId);
            
            // Query untuk melihat semua sesi tanpa filter status dulu
            const [allSessions] = await connection.query(
                'SELECT * FROM whatsapp_sessions WHERE user_id = ?',
                [userId]
            );
            console.log('All sessions (without status filter):', allSessions);
            
            // Query dengan filter status
            const [activeSessions] = await connection.query(
                'SELECT * FROM whatsapp_sessions WHERE user_id = ? AND status = ?',
                [userId, 'active']
            );
            console.log('Active sessions:', activeSessions);
            
            // Query untuk memeriksa status yang ada di database
            const [statuses] = await connection.query(
                'SELECT DISTINCT status FROM whatsapp_sessions WHERE user_id = ?',
                [userId]
            );
            console.log('Available statuses:', statuses);
    
            // Jika tidak ada sesi aktif, kembalikan array kosong
            if (activeSessions.length === 0) {
                return [];
            }
    
            // Proses sesi yang aktif
            const processedSessions = [];
            for (const session of activeSessions) {
                const client = this.sessions.get(session.phone_number);
                
                if (!client || !client.info) {
                    console.log(`Session ${session.phone_number} needs initialization`);
                    try {
                        const client = new Client({
                            puppeteer: {
                                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                                headless: true
                            }
                        });
    
                        await new Promise((resolve, reject) => {
                            client.on('ready', () => {
                                console.log(`Client ready for ${session.phone_number}`);
                                this.sessions.set(session.phone_number, client);
                                resolve();
                            });
    
                            client.on('auth_failure', () => {
                                console.log(`Auth failed for ${session.phone_number}`);
                                reject(new Error('Authentication failed'));
                            });
    
                            client.initialize().catch(reject);
                        });
    
                        processedSessions.push(session);
                    } catch (error) {
                        console.error(`Failed to initialize session ${session.phone_number}:`, error);
                        await this.updateSessionStatus(session.phone_number, 'inactive');
                    }
                } else {
                    console.log(`Session ${session.phone_number} already initialized`);
                    processedSessions.push(session);
                }
            }
    
            console.log(`Returning ${processedSessions.length} processed sessions`);
            return processedSessions;
        } catch (error) {
            console.error('Error in getAllActiveSessions:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async debugDatabase() {
        const connection = await pool.getConnection();
        try {
            // 1. Check table structure
            const [columns] = await connection.query(`
                SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'whatsapp_sessions'
            `);
            console.log('Table structure:', columns);
    
            // 2. Check all records
            const [allRecords] = await connection.query('SELECT * FROM whatsapp_sessions');
            console.log('All records:', allRecords);
    
            // 3. Check enum values for status
            const [enumValues] = await connection.query(`
                SELECT COLUMN_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'whatsapp_sessions'
                AND COLUMN_NAME = 'status'
            `);
            console.log('Status enum values:', enumValues);
    
            return {
                tableStructure: columns,
                records: allRecords,
                statusEnumValues: enumValues
            };
        } finally {
            connection.release();
        }
    }

    async updateSessionStatus(phoneNumber, status) {
        const connection = await pool.getConnection();
        try {
            console.log(`Updating session status for ${phoneNumber} to ${status}`);
            await connection.query(
                'UPDATE whatsapp_sessions SET status = ?, updated_at = NOW() WHERE phone_number = ?',
                [status, phoneNumber]
            );
        } catch (error) {
            console.error(`Error updating session status: ${error.message}`);
            throw error;
        } finally {
            connection.release();
        }
    }


    async getRandomActiveSession(userId) {
        const connection = await pool.getConnection();
        try {
            // Get all sessions for the user
            const [allSessions] = await connection.query(
                'SELECT id, phone_number FROM whatsapp_sessions WHERE user_id = ?',
                [userId]
            );

            console.log('All sessions for user:', allSessions);

            if (!allSessions || allSessions.length === 0) {
                throw new Error('No WhatsApp sessions found');
            }

            // Filter for actually connected sessions
            const connectedSessions = allSessions.filter(session => {
                const isConnected = this.sessions.has(session.phone_number);
                const client = this.sessions.get(session.phone_number);
                return isConnected && client && client.info;
            });

            console.log('Connected sessions:', connectedSessions);

            if (connectedSessions.length === 0) {
                throw new Error('No connected WhatsApp sessions available. Please scan QR code to reconnect.');
            }

            // Select random session from connected ones
            const randomIndex = Math.floor(Math.random() * connectedSessions.length);
            const selectedSession = connectedSessions[randomIndex];

            console.log('Selected session:', selectedSession);

            return {
                sessionId: selectedSession.id,
                phoneNumber: selectedSession.phone_number
            };
        } finally {
            connection.release();
        }
    }

    isSessionActive(phoneNumber) {
        const client = this.sessions.get(phoneNumber);
        if (!client) return false;
        return client.info !== null && client.info !== undefined;
    }

    async sendMessage(sessionPhone, targetNumber, message, userId, imagePath = null, delay = 0) {
        console.log(`Attempting to send message to ${targetNumber} using ${sessionPhone}`);
        let client = this.sessions.get(sessionPhone);
    
        if (!client || !client.info) {
            throw new Error(`Session ${sessionPhone} is not ready`);
        }
    
        const connection = await pool.getConnection();
        try {
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }
    
            const formattedNumber = targetNumber.replace(/[^\d]/g, '');
            const fullNumber = `${formattedNumber}@c.us`;
    
            // Check if number exists on WhatsApp
            const isRegistered = await client.isRegisteredUser(fullNumber);
            if (!isRegistered) {
                throw new Error(`Number ${targetNumber} is not registered on WhatsApp`);
            }
    
            // Get WhatsApp session ID
            const [sessions] = await connection.query(
                'SELECT id FROM whatsapp_sessions WHERE phone_number = ?',
                [sessionPhone]
            );
    
            if (!sessions || sessions.length === 0) {
                throw new Error('WhatsApp session not found in database');
            }
    
            const sessionId = sessions[0].id;
    
            // Create message record first with pending status
            const [messageResult] = await connection.query(
                `INSERT INTO messages 
                (user_id, whatsapp_session_id, target_number, message, image_path, status) 
                VALUES (?, ?, ?, ?, ?, 'pending')`,
                [userId, sessionId, targetNumber, message, imagePath]
            );
    
            const messageId = messageResult.insertId;
    
            // Decrement message count
            await Message.decrementUserPlan(userId, 1);
    
            // Format pesan dengan emoji jika ada
            const formattedMessage = this.convertEmojiCodes(message);
    
            // Send message
            if (imagePath) {
                console.log(`Sending message with image: ${imagePath}`);
                try {
                    const MessageMedia = require('whatsapp-web.js').MessageMedia;
                    const media = await MessageMedia.fromFilePath(imagePath);
                    await client.sendMessage(fullNumber, media, {
                        caption: formattedMessage
                    });
                } catch (imageError) {
                    console.error('Error sending image:', imageError);
                    await client.sendMessage(fullNumber, formattedMessage);
                }
            } else {
                await client.sendMessage(fullNumber, formattedMessage);
            }
    
            // Update message status to sent
            await connection.query(
                'UPDATE messages SET status = ?, updated_at = NOW() WHERE id = ?',
                ['sent', messageId]
            );
    
            console.log(`Message sent successfully to ${targetNumber}`);
            return true;
        } catch (error) {
            // If there's a message record, update it to failed
            if (messageId) {
                await connection.query(
                    'UPDATE messages SET status = ?, updated_at = NOW() WHERE id = ?',
                    ['failed', messageId]
                );
            }
    
            console.error(`Error sending message:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }

    

    async decrementMessageCount(sessionPhone) {
        const connection = await pool.getConnection();
        try {
            await connection.query(
                `UPDATE user_plans up
                 JOIN whatsapp_sessions ws ON ws.user_id = up.user_id
                 SET up.messages_remaining = up.messages_remaining - 1
                 WHERE ws.phone_number = ?
                 AND up.status = 'active'
                 AND up.messages_remaining > 0`,
                [sessionPhone]
            );
        } finally {
            connection.release();
        }
    }

    async checkConnection(phoneNumber) {
        const client = this.sessions.get(phoneNumber);
        if (!client) {
            return false;
        }
        try {
            return client.info !== null;
        } catch (error) {
            return false;
        }
    }

    async sendMessageWithButton(sessionPhone, targetNumber, message, buttonData, userId, delay = 0) {
        console.log(`Attempting to send message with link to ${targetNumber} using ${sessionPhone}`);
        let client = this.sessions.get(sessionPhone);
    
        if (!client || !client.info) {
            throw new Error(`Session ${sessionPhone} is not ready`);
        }
    
        try {
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }
    
            const formattedNumber = targetNumber.replace(/[^\d]/g, '');
            const fullNumber = `${formattedNumber}@c.us`;
    
            // Check if number exists on WhatsApp
            const isRegistered = await client.isRegisteredUser(fullNumber);
            if (!isRegistered) {
                throw new Error(`Number ${targetNumber} is not registered on WhatsApp`);
            }
    
            // Decrement message count
            await Message.decrementUserPlan(userId, 1);
    
            // Format pesan dengan emoji dan tambahkan link
            const formattedMessage = this.convertEmojiCodes(message);
            
            // Buat format pesan yang lebih menarik dengan link
            const messageWithLink = `${formattedMessage}\n\n${buttonData.buttonText} 👉 ${buttonData.url}\n\n${buttonData.footerText || ''}`;
    
            // Kirim pesan
            await client.sendMessage(fullNumber, messageWithLink);
    
            console.log(`Message with link sent successfully to ${targetNumber}`);
            return true;
        } catch (error) {
            console.error(`Error sending message with link:`, error);
            throw error;
        }
    }

    async disconnectSession(phoneNumber) {
        try {
            const client = this.sessions.get(phoneNumber);
            if (client) {
                await client.destroy();
                this.sessions.delete(phoneNumber);
                console.log(`WhatsApp client destroyed for ${phoneNumber}`);
            }
            
            // Clean up auth files
            const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session-${phoneNumber}`);
            await this.safeRemoveDir(sessionPath);
            
            return true;
        } catch (error) {
            console.error(`Error disconnecting session ${phoneNumber}:`, error);
            throw error;
        }
    }
    

}

module.exports = new WhatsappService();