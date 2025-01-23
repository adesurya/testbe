// src/controllers/reportController.js

class ReportController {
    async getTransactionReport(req, res) {
        const connection = await pool.getConnection();
        try {
            const {
                startDate,
                endDate,
                userId,
                transactionType,
                paymentMethod,
                page = 1,
                limit = 10
            } = req.query;

            let queryConditions = [];
            const queryParams = [];

            if (startDate) {
                queryConditions.push('pt.created_at >= ?');
                queryParams.push(startDate);
            }
            if (endDate) {
                queryConditions.push('pt.created_at <= ?');
                queryParams.push(endDate);
            }
            if (userId) {
                queryConditions.push('pt.user_id = ?');
                queryParams.push(userId);
            }
            if (transactionType) {
                queryConditions.push('pt.transaction_type = ?');
                queryParams.push(transactionType);
            }
            if (paymentMethod) {
                queryConditions.push('pt.payment_method = ?');
                queryParams.push(paymentMethod);
            }

            const whereClause = queryConditions.length 
                ? 'WHERE ' + queryConditions.join(' AND ') 
                : '';

            const offset = (page - 1) * limit;
            queryParams.push(parseInt(limit), offset);

            const [transactions] = await connection.query(
                `SELECT 
                    pt.*,
                    u.username,
                    p.name as plan_name
                FROM plan_transactions pt
                JOIN users u ON pt.user_id = u.id
                JOIN plans p ON pt.plan_id = p.id
                ${whereClause}
                ORDER BY pt.created_at DESC
                LIMIT ? OFFSET ?`,
                queryParams
            );

            // Get total count for pagination
            const [totalCount] = await connection.query(
                `SELECT COUNT(*) as total 
                FROM plan_transactions pt
                ${whereClause}`,
                queryConditions.length ? queryParams.slice(0, -2) : []
            );

            // Get summary statistics
            const [summary] = await connection.query(
                `SELECT 
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_amount,
                    COUNT(DISTINCT user_id) as unique_users,
                    SUM(messages_added) as total_messages
                FROM plan_transactions pt
                ${whereClause}`,
                queryConditions.length ? queryParams.slice(0, -2) : []
            );

            res.json({
                success: true,
                data: {
                    transactions,
                    summary: summary[0],
                    pagination: {
                        total: totalCount[0].total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: Math.ceil(totalCount[0].total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Error getting transaction report:', error);
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }

    async getTransactionSummary(req, res) {
        const connection = await pool.getConnection();
        try {
            const [monthlySummary] = await connection.query(
                `SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_amount,
                    COUNT(DISTINCT user_id) as unique_users,
                    SUM(messages_added) as total_messages,
                    payment_method
                FROM plan_transactions
                GROUP BY DATE_FORMAT(created_at, '%Y-%m'), payment_method
                ORDER BY month DESC, payment_method`
            );

            const [paymentMethodSummary] = await connection.query(
                `SELECT 
                    payment_method,
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_amount
                FROM plan_transactions
                GROUP BY payment_method`
            );

            res.json({
                success: true,
                data: {
                    monthlySummary,
                    paymentMethodSummary
                }
            });
        } catch (error) {
            console.error('Error getting transaction summary:', error);
            res.status(500).json({ success: false, error: error.message });
        } finally {
            connection.release();
        }
    }
}

module.exports = new ReportController();