// src/controllers/userController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const User = require('../models/User');

class UserController {

    async register(req, res) {
        const connection = await pool.getConnection();
        try {
            const { username, email, password } = req.body;
     
            // Validate input
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Username, email and password are required'
                });
            }
     
            // Check if username exists
            const [existingUsername] = await connection.query(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );
     
            if (existingUsername.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Username already exists'
                });
            }
     
            // Check if email exists
            const [existingEmail] = await connection.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );
     
            if (existingEmail.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already exists'
                });
            }
     
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
     
            // Create user
            const [result] = await connection.query(
                'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, "user", "active")',
                [username, email, hashedPassword]
            );
     
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    id: result.insertId,
                    username,
                    email
                }
            });
        } catch (error) {
            console.error('Error in register:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        } finally {
            connection.release();
        }
     }

    // Login untuk user dan admin
    async login(req, res) {
        try {
            const { username, password } = req.body;
            
            const connection = await pool.getConnection();
            try {
                const [users] = await connection.query(
                    'SELECT * FROM users WHERE username = ? AND status = "active"',
                    [username]
                );

                if (!users || users.length === 0) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                const user = users[0];
                const isMatch = await bcrypt.compare(password, user.password);

                if (!isMatch) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                const token = jwt.sign(
                    { id: user.id, role: user.role },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role
                    }
                });
            } finally {
                connection.release();
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Create new user (admin only)
    async createUser(req, res) {
        try {
            const { username, password, email } = req.body;
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const connection = await pool.getConnection();
            try {
                const [result] = await connection.query(
                    'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, "user")',
                    [username, hashedPassword, email]
                );

                res.status(201).json({
                    message: 'User created successfully',
                    userId: result.insertId
                });
            } finally {
                connection.release();
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const userData = req.body;

            await User.updateUser(userId, userData);

            res.json({
                message: 'User updated successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Delete user (Admin only)
    async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            await User.deleteUser(userId);

            res.json({
                message: 'User deleted successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get all users (Admin only)
    async getAllUsers(req, res) {
        const connection = await pool.getConnection();
        try {
            const [users] = await connection.query(
                `SELECT id, username, email, role, status, created_at 
                 FROM users 
                 ORDER BY created_at DESC`
            );
            res.json({
                success: true,
                data: users
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    }

    // Get user by ID (Admin only)
    async getUserById(req, res) {
        try {
            const { userId } = req.params;
            const user = await User.getUserById(userId);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(user);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // Get metrics for admin
    async getMetrics(req, res) {
        try {
            const connection = await pool.getConnection();
            try {
                let query = `
                    SELECT 
                        u.username,
                        COUNT(DISTINCT ws.id) as total_whatsapp_sessions,
                        COUNT(m.id) as total_messages,
                        SUM(CASE WHEN m.status = 'sent' THEN 1 ELSE 0 END) as successful_messages,
                        SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END) as failed_messages
                    FROM users u
                    LEFT JOIN whatsapp_sessions ws ON u.id = ws.user_id
                    LEFT JOIN messages m ON u.id = m.user_id
                `;

                if (req.user.role !== 'admin') {
                    query += ' WHERE u.id = ?';
                }

                query += ' GROUP BY u.id';

                const [metrics] = await connection.query(
                    query,
                    req.user.role !== 'admin' ? [req.user.id] : []
                );

                res.json(metrics);
            } finally {
                connection.release();
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUserProfile(req, res) {
        try {
            const requestedUserId = parseInt(req.params.userId);
            const loggedInUserId = req.user.id;
            const isAdmin = req.user.role === 'admin';
    
            // Allow admin to view any profile, but regular users can only view their own
            if (!isAdmin && requestedUserId !== loggedInUserId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied. You can only view your own profile.'
                });
            }
    
            const connection = await pool.getConnection();
            try {
                const [user] = await connection.query(
                    `SELECT 
                        id,
                        username,
                        email,
                        role,
                        status,
                        created_at,
                        updated_at,
                        profile_picture,
                        oauth_provider
                    FROM users 
                    WHERE id = ? AND status = 'active'`,
                    [requestedUserId]
                );
    
                if (!user || user.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }
    
                const userProfile = user[0];
                delete userProfile.password;
    
                res.json({
                    success: true,
                    data: userProfile
                });
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error in getUserProfile:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}

module.exports = new UserController();