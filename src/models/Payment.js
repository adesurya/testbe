// src/models/Payment.js
const pool = require('../config/database');

class Payment {
    static async create(paymentData) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                `INSERT INTO payments 
                (user_id, plan_id, merchant_order_id, reference, amount, payment_method, payment_url, expiry_time) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    paymentData.userId,
                    paymentData.planId,
                    paymentData.merchantOrderId,
                    paymentData.reference,
                    paymentData.amount,
                    paymentData.paymentMethod,
                    paymentData.paymentUrl,
                    paymentData.expiryTime
                ]
            );
            return result.insertId;
        } finally {
            connection.release();
        }
    }

    static async getByMerchantOrderId(merchantOrderId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT * FROM payments WHERE merchant_order_id = ?`,
                [merchantOrderId]
            );
            return rows[0];
        } finally {
            connection.release();
        }
    }

    static async updateStatus(merchantOrderId, status, reference = null) {
        const connection = await pool.getConnection();
        try {
            const updateFields = ['status = ?'];
            const updateValues = [status];

            if (reference) {
                updateFields.push('reference = ?');
                updateValues.push(reference);
            }

            updateValues.push(merchantOrderId);

            await connection.query(
                `UPDATE payments 
                 SET ${updateFields.join(', ')}, 
                 updated_at = CURRENT_TIMESTAMP 
                 WHERE merchant_order_id = ?`,
                updateValues
            );

            console.log(`Payment ${merchantOrderId} status updated to ${status}`);
        } finally {
            connection.release();
        }
    }

    static async getByMerchantOrderId(merchantOrderId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT * FROM payments WHERE merchant_order_id = ?`,
                [merchantOrderId]
            );
            return rows[0];
        } finally {
            connection.release();
        }
    }

    static async getUserPayments(userId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT 
                    p.*,
                    pl.name as plan_name,
                    pl.message_limit,
                    pl.duration_days
                FROM payments p
                JOIN plans pl ON p.plan_id = pl.id
                WHERE p.user_id = ?
                ORDER BY p.created_at DESC`,
                [userId]
            );
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getPendingPayments() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT * FROM payments 
                WHERE status = 'pending' 
                AND expiry_time > NOW()`
            );
            return rows;
        } finally {
            connection.release();
        }
    }

    static async expirePayments() {
        const connection = await pool.getConnection();
        try {
            await connection.query(
                `UPDATE payments 
                SET status = 'expired' 
                WHERE status = 'pending' 
                AND expiry_time <= NOW()`
            );
        } finally {
            connection.release();
        }
    }
}

module.exports = Payment;