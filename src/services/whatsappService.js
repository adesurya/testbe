// src/services/whatsappService.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const pool = require('../config/database');
const WhatsappSession = require('../models/WhatsappSession');

class WhatsappService {
    constructor() {
        this.sessions = new Map();
        this.initializeSessions();
    }

    async initializeSessions() {
        const connection = await pool.getConnection();
        try {
            // Reset all sessions to inactive first
            await connection.query('UPDATE whatsapp_sessions SET status = "inactive"');
            console.log('Reset all sessions to inactive');
        } catch (error) {
            console.error('Error resetting sessions:', error);
        } finally {
            connection.release();
        }
    }

    async initializeSession(userId, phoneNumber) {
        try {
            console.log('Initializing WhatsApp session for:', phoneNumber);
            
            const client = new Client({
                puppeteer: {
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu'
                    ],
                    headless: true
                },
                authStrategy: new LocalAuth({
                    clientId: phoneNumber,
                    dataPath: './whatsapp-sessions'
                })
            });

            return new Promise((resolve, reject) => {
                client.on('qr', async (qr) => {
                    try {
                        console.log('QR Code generated for:', phoneNumber);
                        const qrCode = await qrcode.toDataURL(qr);
                        resolve({ qrCode });
                    } catch (error) {
                        console.error('Error generating QR:', error);
                        reject(error);
                    }
                });

                client.on('ready', async () => {
                    try {
                        console.log('WhatsApp client ready for:', phoneNumber);
                        await WhatsappSession.updateStatus(phoneNumber, 'active');
                        this.sessions.set(phoneNumber, client);
                    } catch (error) {
                        console.error('Error in ready event:', error);
                    }
                });

                client.on('authenticated', () => {
                    console.log('WhatsApp client authenticated for:', phoneNumber);
                });

                client.on('auth_failure', async (msg) => {
                    console.log('Auth failed for:', phoneNumber, msg);
                    await WhatsappSession.updateStatus(phoneNumber, 'inactive');
                    this.sessions.delete(phoneNumber);
                    reject(new Error('Authentication failed'));
                });

                client.on('disconnected', async (reason) => {
                    console.log('WhatsApp client disconnected for:', phoneNumber, reason);
                    await WhatsappSession.updateStatus(phoneNumber, 'inactive');
                    this.sessions.delete(phoneNumber);
                });

                client.initialize().catch(reject);
            });
        } catch (error) {
            console.error('Error initializing session:', error);
            throw error;
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
        try {
            console.log('Sending message using session:', sessionPhone);
            const client = this.sessions.get(sessionPhone);
            
            if (!client) {
                throw new Error('WhatsApp session not found');
            }

            if (!client.info) {
                throw new Error('WhatsApp session not ready');
            }

            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }

            const formattedNumber = targetNumber.replace(/[^\d]/g, '');
            const fullNumber = `${formattedNumber}@c.us`;

            if (imagePath) {
                await client.sendMessage(fullNumber, {
                    file: imagePath,
                    caption: message
                });
            } else {
                await client.sendMessage(fullNumber, message);
            }

            console.log('Message sent successfully to:', targetNumber);
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
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