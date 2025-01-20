// src/controllers/userController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

class UserController {
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
        try {
            const users = await User.getAllUsers();
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
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
}

module.exports = new UserController();