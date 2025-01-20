// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            throw new Error('No Authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            throw new Error('No token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const connection = await pool.getConnection();
        try {
            const [users] = await connection.query(
                'SELECT * FROM users WHERE id = ? AND status = "active"',
                [decoded.id]
            );

            if (!users || users.length === 0) {
                throw new Error('User not found or inactive');
            }

            req.user = users[0];
            req.token = token;
            next();
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(401).json({ 
            error: 'Please authenticate',
            details: error.message
        });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Access denied. Admin only.' 
            });
        }
        next();
    } catch (error) {
        res.status(500).json({ 
            error: 'Error checking admin status',
            details: error.message
        });
    }
};

module.exports = { auth, isAdmin };