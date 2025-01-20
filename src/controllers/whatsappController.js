// src/controllers/whatsappController.js
const WhatsappService = require('../services/whatsappService');
const WhatsappSession = require('../models/WhatsappSession');

class WhatsappController {
    async bindWhatsapp(req, res) {
        console.log('bindWhatsapp method called', req.body);
        try {
            const { userId, phoneNumber } = req.body;
            
            if (!userId || !phoneNumber) {
                console.log('Missing required fields');
                return res.status(400).json({ 
                    error: 'userId and phoneNumber are required' 
                });
            }

            console.log('Initializing WhatsApp session...');
            const qrCode = await WhatsappService.initializeSession(userId, phoneNumber);
            
            console.log('Creating WhatsApp session in database...');
            await WhatsappSession.create(userId, phoneNumber);

            console.log('Sending QR code response...');
            res.json({ qrCode });
        } catch (error) {
            console.error('Error in bindWhatsapp:', error);
            res.status(500).json({ 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    async getActiveSessions(req, res) {
        console.log('getActiveSessions method called', req.params);
        try {
            const { userId } = req.params;
            
            if (!userId) {
                return res.status(400).json({ 
                    error: 'userId is required' 
                });
            }

            const sessions = await WhatsappSession.findActiveSessions(userId);
            res.json(sessions);
        } catch (error) {
            console.error('Error in getActiveSessions:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getAllSessions(req, res) {
        try {
            const sessions = await WhatsappSession.getAllSessions();
            res.json({
                status: 'success',
                data: sessions.map(session => ({
                    ...session,
                    total_messages: Number(session.total_messages || 0),
                    sent_messages: Number(session.sent_messages || 0),
                    failed_messages: Number(session.failed_messages || 0)
                }))
            });
        } catch (error) {
            console.error('Error getting all sessions:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getUserSessions(req, res) {
        try {
            const { userId } = req.params;
            
            // Check if user is requesting their own sessions or is admin
            if (req.user.id !== Number(userId) && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const sessions = await WhatsappSession.getSessionsByUser(userId);
            res.json({
                status: 'success',
                data: sessions.map(session => ({
                    ...session,
                    total_messages: Number(session.total_messages || 0),
                    sent_messages: Number(session.sent_messages || 0),
                    failed_messages: Number(session.failed_messages || 0)
                }))
            });
        } catch (error) {
            console.error('Error getting user sessions:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getMetrics(req, res) {
        try {
            const metrics = await WhatsappSession.getMetrics();
            
            // Format numbers
            const formattedMetrics = {
                general: {
                    ...metrics.general,
                    total_sessions: Number(metrics.general.total_sessions || 0),
                    active_sessions: Number(metrics.general.active_sessions || 0),
                    total_messages: Number(metrics.general.total_messages || 0),
                    sent_messages: Number(metrics.general.sent_messages || 0),
                    failed_messages: Number(metrics.general.failed_messages || 0)
                },
                userMetrics: metrics.userMetrics.map(user => ({
                    ...user,
                    total_sessions: Number(user.total_sessions || 0),
                    active_sessions: Number(user.active_sessions || 0),
                    total_messages: Number(user.total_messages || 0),
                    sent_messages: Number(user.sent_messages || 0)
                })),
                dailyStats: metrics.dailyStats.map(stat => ({
                    ...stat,
                    total_messages: Number(stat.total_messages || 0),
                    sent_messages: Number(stat.sent_messages || 0)
                }))
            };

            res.json({
                status: 'success',
                data: formattedMetrics
            });
        } catch (error) {
            console.error('Error getting metrics:', error);
            res.status(500).json({ error: error.message });
        }
    }


    async deactivateSession(req, res) {
        try {
            const { sessionId } = req.params;
            await WhatsappSession.deactivateSession(sessionId);
            await WhatsappService.disconnectSession(sessionId);
            res.json({ message: 'Session deactivated successfully' });
        } catch (error) {
            console.error('Error deactivating session:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getSessionStats(req, res) {
        try {
            const stats = await WhatsappSession.getSessionStats();
            res.json(stats);
        } catch (error) {
            console.error('Error getting session stats:', error);
            res.status(500).json({ error: error.message });
        }
    }

}

module.exports = new WhatsappController();