// src/services/whatsappService.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const pool = require('../config/database');
const WhatsappSession = require('../models/WhatsappSession');

class WhatsappService {
    constructor() {
        this.sessions = new Map();
        this.cleanupAuthFiles();  
        this.resetSessions();
        this.initializeExistingSessions();

    }

    async cleanupAuthFiles() {
        try {
            const fs = require('fs');
            const path = require('path');
            const authPath = path.join(process.cwd(), '.wwebjs_auth');
            
            if (fs.existsSync(authPath)) {
                fs.rmdirSync(authPath, { recursive: true });
                console.log('Cleaned up auth files');
            }
        } catch (error) {
            console.error('Error cleaning up auth files:', error);
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
        try {
            console.log(`Initializing WhatsApp session for ${phoneNumber}`);
            
            const client = new Client({
                puppeteer: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    headless: true
                }
            });

            return new Promise((resolve, reject) => {
                client.on('qr', async (qr) => {
                    try {
                        console.log(`QR Code generated for ${phoneNumber}`);
                        const qrCode = await qrcode.toDataURL(qr);
                        resolve({ qrCode });
                    } catch (error) {
                        reject(error);
                    }
                });

                client.on('ready', async () => {
                    console.log(`WhatsApp client ready for ${phoneNumber}`);
                    await this.updateSessionStatus(phoneNumber, 'active');
                    this.sessions.set(phoneNumber, client);
                });

                client.on('authenticated', () => {
                    console.log(`WhatsApp client authenticated for ${phoneNumber}`);
                });

                client.on('auth_failure', async () => {
                    console.log(`Auth failed for ${phoneNumber}`);
                    await this.updateSessionStatus(phoneNumber, 'inactive');
                    this.sessions.delete(phoneNumber);
                });

                client.on('disconnected', async () => {
                    console.log(`WhatsApp client disconnected for ${phoneNumber}`);
                    await this.updateSessionStatus(phoneNumber, 'inactive');
                    this.sessions.delete(phoneNumber);
                });

                client.initialize().catch(reject);
            });
        } catch (error) {
            console.error(`Error initializing session for ${phoneNumber}:`, error);
            throw error;
        }
    }


    async getAllActiveSessions(userId) {
        const connection = await pool.getConnection();
        try {
            console.log(`Getting active sessions for user ${userId}`);
            
            // Get all sessions marked as active in database
            const [sessions] = await connection.query(
                'SELECT * FROM whatsapp_sessions WHERE user_id = ? AND status = "active"',
                [userId]
            );
            
            console.log(`Found ${sessions.length} sessions in database`);
    
            if (sessions.length === 0) {
                return [];
            }
    
            // Check and reinitialize sessions if needed
            const activeSessions = [];
            for (const session of sessions) {
                const client = this.sessions.get(session.phone_number);
                
                if (!client || !client.info) {
                    console.log(`Session ${session.phone_number} not initialized or not ready, attempting to initialize`);
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
                                reject(new Error('Authentication failed'));
                            });
    
                            client.initialize().catch(reject);
                        });
    
                        activeSessions.push(session);
                    } catch (error) {
                        console.error(`Failed to initialize session ${session.phone_number}:`, error);
                        await this.updateSessionStatus(session.phone_number, 'inactive');
                        continue;
                    }
                } else {
                    console.log(`Session ${session.phone_number} already initialized and ready`);
                    activeSessions.push(session);
                }
            }
    
            console.log(`Returning ${activeSessions.length} active sessions`);
            return activeSessions;
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
    
            // Check if number exists on WhatsApp
            const isRegistered = await client.isRegisteredUser(fullNumber);
            if (!isRegistered) {
                throw new Error(`Number ${targetNumber} is not registered on WhatsApp`);
            }
    
            // Send message with or without image
            if (imagePath) {
                console.log(`Sending message with image: ${imagePath}`);
                try {
                    const MessageMedia = require('whatsapp-web.js').MessageMedia;
                    const media = await MessageMedia.fromFilePath(imagePath);
                    await client.sendMessage(fullNumber, media, {
                        caption: message
                    });
                } catch (imageError) {
                    console.error('Error sending image:', imageError);
                    // If image fails, try to send just the message
                    await client.sendMessage(fullNumber, message);
                }
            } else {
                await client.sendMessage(fullNumber, message);
            }
    
            // Update user plan message count
            await this.decrementMessageCount(sessionPhone);
    
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