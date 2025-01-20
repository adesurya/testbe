// src/services/whatsappService.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const pool = require('../config/database');
const WhatsappSession = require('../models/WhatsappSession');
const fs = require('fs');
const path = require('path');

class WhatsappService {
    constructor() {
        this.sessions = new Map();
        this.cleanupAuthFiles();  
        this.resetSessions();
        this.initializeExistingSessions();
        this.initializationPromises = new Map(); // Track ongoing initializations
        this.initialize();
    }

    async initialize() {
        await this.cleanupAuthFiles();
        await this.resetSessions();
    }

    async cleanupAuthFiles() {
        try {
            // Path ke direktori .wwebjs_auth
            const authPath = path.join(process.cwd(), '.wwebjs_auth');
            const cachePath = path.join(process.cwd(), '.wwebjs_cache');
            
            // Hapus direktori auth jika ada
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log('Cleaned up auth files');
            }
            
            // Hapus direktori cache jika ada
            if (fs.existsSync(cachePath)) {
                fs.rmSync(cachePath, { recursive: true, force: true });
                console.log('Cleaned up cache files');
            }
        } catch (error) {
            console.error('Error cleaning up files:', error);
        }
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
        // Check if initialization is already in progress
        if (this.initializationPromises.has(phoneNumber)) {
            console.log(`Initialization already in progress for ${phoneNumber}`);
            return this.initializationPromises.get(phoneNumber);
        }

        console.log(`Initializing WhatsApp session for ${phoneNumber}`);

        const initPromise = new Promise(async (resolve, reject) => {
            try {
                // Set timeout for initialization
                const timeoutId = setTimeout(() => {
                    this.initializationPromises.delete(phoneNumber);
                    reject(new Error('Initialization timeout'));
                }, 60000); // 60 seconds timeout

                const client = new Client({
                    puppeteer: {
                        args: ['--no-sandbox', '--disable-setuid-sandbox'],
                        headless: true
                    },
                    // Disable local auth storage
                    authStrategy: new LocalAuth({
                        clientId: phoneNumber,
                        dataPath: path.join(process.cwd(), '.wwebjs_auth_temp')
                    })
                });

                let qrGenerated = false;

                client.on('qr', async (qr) => {
                    try {
                        if (!qrGenerated) {
                            console.log(`QR Code generated for ${phoneNumber}`);
                            const qrCode = await qrcode.toDataURL(qr);
                            qrGenerated = true;
                            resolve({ qrCode });
                        }
                    } catch (error) {
                        reject(error);
                    }
                });

                client.on('ready', async () => {
                    console.log(`WhatsApp client ready for ${phoneNumber}`);
                    await this.updateSessionStatus(phoneNumber, 'active');
                    this.sessions.set(phoneNumber, client);
                });

                client.on('auth_failure', async () => {
                    console.log(`Auth failed for ${phoneNumber}`);
                    await this.updateSessionStatus(phoneNumber, 'inactive');
                    this.sessions.delete(phoneNumber);
                    this.initializationPromises.delete(phoneNumber);
                });

                client.on('disconnected', async () => {
                    console.log(`WhatsApp client disconnected for ${phoneNumber}`);
                    await this.updateSessionStatus(phoneNumber, 'inactive');
                    this.sessions.delete(phoneNumber);
                    this.initializationPromises.delete(phoneNumber);
                    client.destroy();
                });

                await client.initialize();
                clearTimeout(timeoutId);
            } catch (error) {
                this.initializationPromises.delete(phoneNumber);
                reject(error);
            }
        });

        this.initializationPromises.set(phoneNumber, initPromise);
        return initPromise;
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
            await connection.query(
                'UPDATE whatsapp_sessions SET status = ?, updated_at = NOW() WHERE phone_number = ?',
                [status, phoneNumber]
            );
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

    async sendMessage(sessionPhone, targetNumber, message, imagePath = null, delay = 0) {
        console.log(`Attempting to send message to ${targetNumber} using ${sessionPhone}`);
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
    
            // Format pesan dengan styling dan emoji
            const formattedMessage = MessageFormatter.formatMessage(message);
    
            // Check if number exists on WhatsApp
            const isRegistered = await client.isRegisteredUser(fullNumber);
            if (!isRegistered) {
                throw new Error(`Number ${targetNumber} is not registered on WhatsApp`);
            }
    
            // Send message with or without image
            if (imagePath) {
                console.log(`Sending formatted message with image: ${imagePath}`);
                try {
                    const MessageMedia = require('whatsapp-web.js').MessageMedia;
                    const media = await MessageMedia.fromFilePath(imagePath);
                    await client.sendMessage(fullNumber, media, {
                        caption: formattedMessage
                    });
                } catch (imageError) {
                    console.error('Error sending image:', imageError);
                    // If image fails, try to send just the message
                    await client.sendMessage(fullNumber, formattedMessage);
                }
            } else {
                await client.sendMessage(fullNumber, formattedMessage);
            }
    
            console.log(`Message sent successfully to ${targetNumber}`);
            return true;
        } catch (error) {
            console.error(`Error sending message:`, error);
            throw error;
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
}

module.exports = new WhatsappService();