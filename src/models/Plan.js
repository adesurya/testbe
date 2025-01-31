// src/models/Plan.js
const pool = require('../config/database');

class Plan {
    static async create(planData) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                `INSERT INTO plans (name, message_limit, price, duration_days) 
                 VALUES (?, ?, ?, ?)`,
                [planData.name, planData.messageLimit, planData.price, planData.durationDays]
            );
            return result.insertId;
        } finally {
            connection.release();
        }
    }

    static async update(planId, planData) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                `UPDATE plans 
                 SET name = ?, message_limit = ?, price = ?, duration_days = ?, 
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND status = 'active'`,
                [planData.name, planData.messageLimit, planData.price, planData.durationDays, planId]
            );

            if (result.affectedRows === 0) {
                throw new Error('Plan not found or inactive');
            }

            return true;
        } finally {
            connection.release();
        }
    }

    static async delete(planId) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                'UPDATE plans SET status = "inactive" WHERE id = ?',
                [planId]
            );

            if (result.affectedRows === 0) {
                throw new Error('Plan not found');
            }

            return true;
        } finally {
            connection.release();
        }
    }

    static async assignToUser(userId, planId, amount) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Get plan details
            const [plans] = await connection.query(
                'SELECT * FROM plans WHERE id = ? AND status = "active"',
                [planId]
            );

            if (!plans.length) {
                throw new Error('Plan not found or inactive');
            }

            const plan = plans[0];

            // Check if user already has an active plan
            const [existingPlans] = await connection.query(
                'SELECT * FROM user_plans WHERE user_id = ? AND status = "active"',
                [userId]
            );

            if (existingPlans.length > 0) {
                throw new Error('User already has an active plan. Please top up instead.');
            }

            const endDate = new Date();
            endDate.setDate(endDate.getDate() + plan.duration_days);

            // Create user plan
            const [userPlanResult] = await connection.query(
                `INSERT INTO user_plans 
                 (user_id, plan_id, messages_remaining, end_date) 
                 VALUES (?, ?, ?, ?)`,
                [userId, planId, plan.message_limit, endDate]
            );

            // Record transaction
            await this.recordTransaction({
                userId,
                planId,
                transactionType: 'purchase',
                amount: amount || plan.price,
                paymentMethod: 'offline',
                messagesAdded: plan.message_limit,
                paymentStatus: 'completed'
            });

            await connection.commit();

            return {
                userPlanId: userPlanResult.insertId,
                planDetails: {
                    name: plan.name,
                    messageLimit: plan.message_limit,
                    endDate: endDate,
                    amount: amount || plan.price
                }
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getPlanTransactions(userId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT 
                    pt.*,
                    p.name as plan_name,
                    u.username
                 FROM plan_transactions pt
                 JOIN plans p ON pt.plan_id = p.id
                 JOIN users u ON pt.user_id = u.id
                 WHERE pt.user_id = ?
                 ORDER BY pt.created_at DESC`,
                [userId]
            );
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getAllTransactions() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT 
                    pt.*,
                    p.name as plan_name,
                    u.username
                 FROM plan_transactions pt
                 JOIN plans p ON pt.plan_id = p.id
                 JOIN users u ON pt.user_id = u.id
                 ORDER BY pt.created_at DESC`
            );
            return rows;
        } finally {
            connection.release();
        }
    }

    static async recordTransaction(transactionData) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                `INSERT INTO plan_transactions 
                (user_id, plan_id, transaction_type, amount, payment_method, messages_added, payment_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    transactionData.userId,
                    transactionData.planId,
                    transactionData.transactionType,
                    transactionData.amount,
                    transactionData.paymentMethod || 'offline',
                    transactionData.messagesAdded,
                    transactionData.paymentStatus || 'completed'
                ]
            );
            return result.insertId;
        } finally {
            connection.release();
        }
    }

    static async topupUserPlan(userId, planId, messages, amount) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Get user's active plan
            const [userPlans] = await connection.query(
                `SELECT up.*, p.name as plan_name, p.price 
                 FROM user_plans up 
                 JOIN plans p ON up.plan_id = p.id 
                 WHERE up.user_id = ? AND up.plan_id = ? AND up.status = 'active'`,
                [userId, planId]
            );

            if (!userPlans.length) {
                throw new Error('No active plan found for this user');
            }

            const userPlan = userPlans[0];

            // Update messages remaining
            await connection.query(
                `UPDATE user_plans 
                 SET messages_remaining = messages_remaining + ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [messages, userPlan.id]
            );

            // Record transaction
            await this.recordTransaction({
                userId,
                planId,
                transactionType: 'topup',
                amount,
                paymentMethod: 'offline',
                messagesAdded: messages,
                paymentStatus: 'completed'
            });

            await connection.commit();

            return {
                userPlanId: userPlan.id,
                planName: userPlan.plan_name,
                messagesAdded: messages,
                newTotalMessages: userPlan.messages_remaining + messages,
                amount: amount
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getUserActivePlan(userId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT up.*, p.name as plan_name, p.message_limit, p.price 
                 FROM user_plans up 
                 JOIN plans p ON up.plan_id = p.id 
                 WHERE up.user_id = ? AND up.status = 'active'
                 ORDER BY up.created_at DESC 
                 LIMIT 1`,
                [userId]
            );
            return rows[0];
        } finally {
            connection.release();
        }
    }

    static async deactivateExpiredPlans() {
        const connection = await pool.getConnection();
        try {
            await connection.query(
                `UPDATE user_plans 
                 SET status = 'expired' 
                 WHERE end_date < NOW() AND status = 'active'`
            );
        } finally {
            connection.release();
        }
    }

    static async getById(planId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT * FROM plans WHERE id = ? AND status = "active"',
                [planId]
            );
            return rows[0];
        } finally {
            connection.release();
        }
    }

    static async getAll() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT * FROM plans WHERE status = "active" ORDER BY price ASC'
            );
            return rows;
        } finally {
            connection.release();
        }
    }

    static async decrementMessageCount(userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Get active plan
            const [activePlans] = await connection.query(
                `SELECT * FROM user_plans 
                 WHERE user_id = ? 
                 AND status = 'active' 
                 AND messages_remaining > 0 
                 AND NOW() < end_date 
                 ORDER BY end_date ASC`,
                [userId]
            );

            if (!activePlans || activePlans.length === 0) {
                throw new Error('No active plan found with remaining messages');
            }

            const plan = activePlans[0];

            // Decrement message count
            const [result] = await connection.query(
                `UPDATE user_plans 
                 SET messages_remaining = messages_remaining - 1,
                     updated_at = NOW()
                 WHERE id = ? AND messages_remaining > 0`,
                [plan.id]
            );

            if (result.affectedRows === 0) {
                throw new Error('Failed to update message count');
            }

            // Add to message usage log
            await connection.query(
                `INSERT INTO message_usage_log 
                 (user_id, plan_id, message_type, created_at) 
                 VALUES (?, ?, 'sent', NOW())`,
                [userId, plan.id]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error decrementing message count:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getUserPlans(userId) {
        const connection = await pool.getConnection();
        try {
            const [plans] = await connection.query(
                `SELECT 
                    up.*,
                    p.name as plan_name,
                    p.price,
                    p.message_limit,
                    p.duration_days
                FROM user_plans up
                JOIN plans p ON up.plan_id = p.id
                WHERE up.user_id = ?
                ORDER BY up.created_at DESC`,
                [userId]
            );

            return {
                success: true,
                data: plans.map(plan => ({
                    id: plan.id,
                    planName: plan.plan_name,
                    messagesRemaining: plan.messages_remaining,
                    startDate: plan.start_date,
                    endDate: plan.end_date,
                    status: plan.status,
                    price: plan.price,
                    messageLimit: plan.message_limit,
                    durationDays: plan.duration_days
                }))
            };
        } finally {
            connection.release();
        }
    }

    static async getAllPlans() {
        const connection = await pool.getConnection();
        try {
            const [plans] = await connection.query(
                `SELECT 
                    p.*,
                    COUNT(up.id) as active_users,
                    SUM(CASE WHEN up.status = 'active' THEN 1 ELSE 0 END) as current_active_users
                FROM plans p
                LEFT JOIN user_plans up ON p.id = up.plan_id
                WHERE p.status = 'active'
                GROUP BY p.id
                ORDER BY p.price ASC`
            );

            return {
                success: true,
                data: plans.map(plan => ({
                    id: plan.id,
                    name: plan.name,
                    messageLimit: plan.message_limit,
                    price: plan.price,
                    durationDays: plan.duration_days,
                    description: plan.description,
                    features: plan.features ? JSON.parse(plan.features) : [],
                    activeUsers: plan.active_users,
                    currentActiveUsers: plan.current_active_users
                }))
            };
        } finally {
            connection.release();
        }
    }


}

module.exports = Plan;