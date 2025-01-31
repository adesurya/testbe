// src/controllers/paymentController.js

const PaymentService = require('../services/paymentService');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const moment = require('moment');
const { PaymentMethodHelper } = require('../config/paymentMethods');

class PaymentController {
    async createTransaction(req, res) {
        try {
            const { planId, paymentMethod } = req.body;
            const user = req.user;

            // Validate user
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            // Validate plan
            const plan = await Plan.findById(planId);
            if (!plan) {
                throw new Error('Plan not found');
            }

            // Create merchant order ID
            const merchantOrderId = `ORDER${moment().format('YYMMDDHHmmss')}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            // Prepare transaction data
            const transactionData = {
                merchantCode: process.env.DUITKU_MERCHANT_CODE,
                merchantOrderId: merchantOrderId,
                paymentAmount: Math.round(plan.price),
                paymentMethod: paymentMethod,
                productDetails: `Payment for ${plan.name}`,
                email: user.email,
                phoneNumber: user.phone || '',
                customerVaName: user.username,
                callbackUrl: process.env.DUITKU_CALLBACK_URL,
                returnUrl: process.env.DUITKU_RETURN_URL,
                expiryPeriod: 10
            };

            // Call Duitku API
            const response = await PaymentService.createTransaction(transactionData);

            // Save payment record
            const paymentData = {
                user_id: user.id,
                plan_id: planId,
                merchant_code: process.env.DUITKU_MERCHANT_CODE,
                merchant_order_id: merchantOrderId,
                reference: response.reference,
                amount: Math.round(plan.price),
                payment_method: paymentMethod,
                payment_url: response.paymentUrl,
                va_number: response.vaNumber || null,
                qr_string: response.qrString || null,
                status: 'pending',
                status_code: response.statusCode,
                status_message: response.statusMessage,
                expiry_time: moment().add(10, 'minutes').toDate(),
                payment_details: JSON.stringify({
                    productDetails: `Payment for ${plan.name}`,
                    customerEmail: user.email,
                    customerName: user.username,
                    originalResponse: response
                })
            };

            await Payment.create(paymentData);

            // Return response in exact format required by Duitku
            res.json({
                merchantCode: process.env.DUITKU_MERCHANT_CODE,
                reference: response.reference,
                paymentUrl: response.paymentUrl,
                vaNumber: response.vaNumber || "",
                qrString: response.qrString || "",
                amount: String(Math.round(plan.price)), // Convert to string as per sample
                statusCode: response.statusCode || "00",
                statusMessage: response.statusMessage || "SUCCESS"
            });

        } catch (error) {
            console.error('[Payment] Error:', error);
            res.status(500).json({
                error: error.message,
                statusCode: "01",
                statusMessage: "FAILED"
            });
        }
    }

    async handleCallback(req, res) {
        console.log('[Payment Callback] Received callback data:', {
            ...req.body,
            signature: '***'  // Mask signature in logs
        });
    
        try {
            const {
                merchantCode,
                amount,
                merchantOrderId,
                productDetail,
                additionalParam,
                paymentCode,
                resultCode,
                merchantUserId,
                reference,
                signature,
                publisherOrderId,
                spUserHash,
                settlementDate,
                issuerCode
            } = req.body;
    
            // Validate required fields
            if (!merchantCode || !merchantOrderId || !amount || !signature) {
                throw new Error('Missing required callback parameters');
            }
    
            // Validate merchant code
            if (merchantCode !== process.env.DUITKU_MERCHANT_CODE) {
                throw new Error('Invalid merchant code');
            }
    
            // Verify signature
            const expectedSignature = crypto
                .createHash('md5')
                .update(`${merchantCode}${amount}${merchantOrderId}${process.env.DUITKU_API_KEY}`)
                .digest('hex');
    
            if (signature !== expectedSignature) {
                throw new Error('Invalid signature');
            }
    
            // Get payment record
            const payment = await Payment.findByMerchantOrderId(merchantOrderId);
            if (!payment) {
                throw new Error(`Payment record not found for order ${merchantOrderId}`);
            }
    
            // Update payment status
            const status = resultCode === '00' ? 'paid' : 'failed';
            const updateData = {
                status,
                status_code: resultCode,
                reference: reference,
                payment_details: JSON.stringify({
                    productDetail,
                    additionalParam,
                    paymentCode,
                    merchantUserId,
                    publisherOrderId,
                    spUserHash,
                    settlementDate,
                    issuerCode,
                    lastUpdate: new Date().toISOString()
                }),
                paid_time: resultCode === '00' ? new Date() : null
            };
    
            await Payment.updateByMerchantOrderId(merchantOrderId, updateData);
    
            // If payment is successful, activate the plan
            if (resultCode === '00') {
                await this.activateUserPlan(payment.user_id, payment.plan_id);
            }
    
            // Return success response to Duitku
            res.status(200).send('OK');
    
        } catch (error) {
            console.error('[Payment Callback] Error:', {
                message: error.message,
                stack: error.stack
            });
    
            // Still return OK to avoid duplicate callbacks
            res.status(200).send('OK');
        }
    }
    
    // Helper method untuk aktivasi plan
    async activateUserPlan(userId, planId) {
        try {
            const plan = await Plan.findById(planId);
            if (!plan) {
                throw new Error('Plan not found');
            }
    
            // Start a database transaction
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
    
                // Create plan transaction record
                await connection.query(
                    `INSERT INTO plan_transactions 
                    (user_id, plan_id, transaction_type, amount, payment_method, payment_status, messages_added)
                    VALUES (?, ?, 'purchase', ?, 'online', 'completed', ?)`,
                    [userId, planId, plan.price, plan.message_limit]
                );
    
                // Create or update user plan
                const [existingPlan] = await connection.query(
                    'SELECT * FROM user_plans WHERE user_id = ? AND status = "active"',
                    [userId]
                );
    
                if (existingPlan.length > 0) {
                    // Update existing plan
                    await connection.query(
                        `UPDATE user_plans 
                         SET messages_remaining = messages_remaining + ?,
                             end_date = DATE_ADD(GREATEST(end_date, NOW()), INTERVAL ? DAY)
                         WHERE id = ?`,
                        [plan.message_limit, plan.duration_days, existingPlan[0].id]
                    );
                } else {
                    // Create new plan
                    const endDate = new Date();
                    endDate.setDate(endDate.getDate() + plan.duration_days);
    
                    await connection.query(
                        `INSERT INTO user_plans 
                        (user_id, plan_id, messages_remaining, end_date, status)
                        VALUES (?, ?, ?, ?, 'active')`,
                        [userId, planId, plan.message_limit, endDate]
                    );
                }
    
                await connection.commit();
    
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
    
        } catch (error) {
            console.error('[Payment] Error activating plan:', error);
            throw error;
        }
    }
}

module.exports = new PaymentController();