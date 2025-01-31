// src/models/Payment.js
const pool = require('../config/database');
const moment = require('moment');

class Payment {
    static async create(paymentData) {
        const connection = await pool.getConnection();
        try {
            // Debug log
            console.log('Debug - Payment.create input:', {
                user_id: paymentData.user_id,
                merchant_order_id: paymentData.merchant_order_id,
                payment_method: paymentData.payment_method
            });

            // Ensure all required fields are present
            if (!paymentData.user_id) {
                throw new Error('user_id is required');
            }

            // Convert user_id to integer if it's not already
            const userId = parseInt(paymentData.user_id);
            if (isNaN(userId)) {
                throw new Error('Invalid user_id format');
            }

            // Prepare insert data with explicit type conversion
            const insertData = {
                user_id: userId,
                plan_id: parseInt(paymentData.plan_id),
                merchant_code: String(paymentData.merchant_code),
                merchant_order_id: String(paymentData.merchant_order_id),
                amount: Number(paymentData.amount),
                payment_method: String(paymentData.payment_method),
                status: paymentData.status || 'pending',
                expiry_time: paymentData.expiry_time
            };

            // Debug log processed data
            console.log('Debug - Processed payment data:', insertData);

            const [result] = await connection.query(
                `INSERT INTO payments SET ?`,
                [insertData]
            );

            if (!result.insertId) {
                throw new Error('Failed to insert payment record');
            }

            // Fetch and return the created record
            const [payments] = await connection.query(
                'SELECT * FROM payments WHERE id = ?',
                [result.insertId]
            );

            return payments[0];

        } catch (error) {
            console.error('Debug - Payment.create error:', {
                error: error.message,
                input: paymentData
            });
            throw error;
        } finally {
            connection.release();
        }
    }


    static async findByMerchantOrderId(merchantOrderId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT p.*, u.email as user_email, u.username as user_name,
                    pl.name as plan_name, pl.duration_days
                FROM payments p
                JOIN users u ON p.user_id = u.id
                JOIN plans pl ON p.plan_id = pl.id
                WHERE p.merchant_order_id = ?`,
                [merchantOrderId]
            );
            return rows[0];
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

    static async updateStatus(merchantOrderId, status, transactionData = {}) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Update payment status
            await connection.query(
                `UPDATE payments SET 
                status = ?,
                payment_details = JSON_SET(
                    COALESCE(payment_details, '{}'),
                    '$.lastUpdate', ?,
                    '$.transactionData', ?
                ),
                updated_at = CURRENT_TIMESTAMP
                WHERE merchant_order_id = ?`,
                [
                    status,
                    moment().format('YYYY-MM-DD HH:mm:ss'),
                    JSON.stringify(transactionData),
                    merchantOrderId
                ]
            );

            // If payment is successful, update user_plans
            if (status === 'paid') {
                const [payment] = await connection.query(
                    'SELECT user_id, plan_id FROM payments WHERE merchant_order_id = ?',
                    [merchantOrderId]
                );

                if (payment.length > 0) {
                    // Add transaction record
                    await connection.query(
                        `INSERT INTO plan_transactions (
                            user_id, plan_id, transaction_type,
                            amount, payment_method, payment_status,
                            messages_added
                        ) VALUES (?, ?, 'purchase', ?, 'online', 'completed', ?)`,
                        [
                            payment[0].user_id,
                            payment[0].plan_id,
                            transactionData.amount || 0,
                            transactionData.messageLimit || 0
                        ]
                    );
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
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
                AND expiry_time > NOW()
                ORDER BY created_at DESC`
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
                SET status = 'expired',
                    updated_at = CURRENT_TIMESTAMP
                WHERE status = 'pending' 
                AND expiry_time <= NOW()`
            );
        } finally {
            connection.release();
        }
    }
    static async getUserPaymentHistory(userId) {
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

    static async getPaymentStatistics(filters = {}) {
        const connection = await pool.getConnection();
        try {
            let whereClause = 'WHERE 1=1';
            const params = [];

            if (filters.startDate) {
                whereClause += ' AND p.created_at >= ?';
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                whereClause += ' AND p.created_at <= ?';
                params.push(filters.endDate);
            }
            if (filters.status) {
                whereClause += ' AND p.status = ?';
                params.push(filters.status);
            }

            const [results] = await connection.query(
                `SELECT 
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as successful_payments,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
                    SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_payments,
                    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
                    payment_method,
                    DATE(created_at) as date
                FROM payments p
                ${whereClause}
                GROUP BY DATE(created_at), payment_method
                ORDER BY date DESC`,
                params
            );

            return results;
        } finally {
            connection.release();
        }
    }

    static async updateByMerchantOrderId(merchantOrderId, updateData) {
        const connection = await pool.getConnection();
        try {
            console.log('[Payment] Updating payment record:', {
                merchantOrderId,
                status: updateData.status,
                statusCode: updateData.status_code
            });
    
            const [result] = await connection.query(
                `UPDATE payments 
                 SET 
                    status = ?,
                    status_code = ?,
                    reference = ?,
                    payment_details = ?,
                    paid_time = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE merchant_order_id = ?`,
                [
                    updateData.status,
                    updateData.status_code,
                    updateData.reference,
                    updateData.payment_details,
                    updateData.paid_time,
                    merchantOrderId
                ]
            );
    
            if (result.affectedRows === 0) {
                throw new Error(`Payment record not found: ${merchantOrderId}`);
            }
    
            // Get updated record
            const [payments] = await connection.query(
                'SELECT * FROM payments WHERE merchant_order_id = ?',
                [merchantOrderId]
            );
    
            return payments[0];
        } finally {
            connection.release();
        }
    }
    
    static async findByMerchantOrderId(merchantOrderId) {
        const connection = await pool.getConnection();
        try {
            const [payments] = await connection.query(
                'SELECT * FROM payments WHERE merchant_order_id = ?',
                [merchantOrderId]
            );
    
            return payments[0];
        } finally {
            connection.release();
        }
    }
    
}

module.exports = Payment;