// src/models/User.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async updateUser(userId, userData) {
        const connection = await pool.getConnection();
        try {
            let password = userData.password ? 
                await bcrypt.hash(userData.password, 10) : undefined;

            const updateFields = [];
            const updateValues = [];

            if (userData.username) {
                updateFields.push('username = ?');
                updateValues.push(userData.username);
            }
            if (userData.email) {
                updateFields.push('email = ?');
                updateValues.push(userData.email);
            }
            if (password) {
                updateFields.push('password = ?');
                updateValues.push(password);
            }
            if (userData.status) {
                updateFields.push('status = ?');
                updateValues.push(userData.status);
            }

            updateValues.push(userId);

            await connection.query(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
            return true;
        } finally {
            connection.release();
        }
    }

    static async deleteUser(userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Deactivate user plans
            await connection.query(
                'UPDATE user_plans SET status = "cancelled" WHERE user_id = ?',
                [userId]
            );

            // Set user status to inactive
            await connection.query(
                'UPDATE users SET status = "inactive" WHERE id = ?',
                [userId]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getAllUsers() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT id, username, email, role, status, created_at, updated_at 
                 FROM users 
                 ORDER BY created_at DESC`
            );
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getUserById(userId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT id, username, email, role, status, created_at, updated_at 
                 FROM users 
                 WHERE id = ?`,
                [userId]
            );
            return rows[0];
        } finally {
            connection.release();
        }
    }
}

module.exports = User;