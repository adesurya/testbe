// src/controllers/paymentController.js

const PaymentService = require('../services/paymentService');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const moment = require('moment');
const { PaymentMethodHelper } = require('../config/paymentMethods');
const crypto = require('crypto');  // Add crypto import


class PaymentController {
    async createTransaction(req, res) {
        try {
            const { planId, paymentMethod, merchantOrderId } = req.body;
            const user = req.user;
    
            if (!planId || !paymentMethod || !merchantOrderId) {
                return res.status(400).json({
                    success: false,
                    error: 'planId, paymentMethod, and merchantOrderId are required'
                });
            }
    
            // Get plan details
            const plan = await Plan.findById(planId);
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    error: 'Plan not found'
                });
            }
    
            // Create transaction data
            const transactionData = {
                merchantOrderId: merchantOrderId,
                paymentMethod: paymentMethod,
                amount: Math.round(plan.price),
                productDetails: `Payment for ${plan.name}`,
                email: user.email,
                customerName: user.username
            };
    
            console.log('[Payment] Creating transaction:', transactionData);
    
            // Call Duitku API
            const duitkuResponse = await PaymentService.createTransaction(transactionData);
    
            console.log('[Payment] Duitku response:', duitkuResponse);
    
            // Save initial payment record with all Duitku response data
            const paymentData = {
                user_id: user.id,
                plan_id: planId,
                merchant_code: process.env.DUITKU_MERCHANT_CODE,
                merchant_order_id: merchantOrderId,
                reference: duitkuResponse.reference,      // Save reference
                amount: Math.round(plan.price),
                payment_method: paymentMethod,
                payment_url: duitkuResponse.paymentUrl,   // Save payment URL
                va_number: duitkuResponse.vaNumber,       // Save VA number
                qr_string: duitkuResponse.qrString,
                status: 'pending',
                status_code: duitkuResponse.statusCode,
                status_message: duitkuResponse.statusMessage,
                expiry_time: moment().add(1, 'hours').toDate(),
                payment_details: JSON.stringify({
                    productDetails: `Payment for ${plan.name}`,
                    customerEmail: user.email,
                    customerName: user.username,
                    duitkuResponse: duitkuResponse
                })
            };
    
            console.log('[Payment] Saving payment record:', {
                ...paymentData,
                payment_details: 'OMITTED'
            });
    
            await Payment.create(paymentData);
    
            // Return complete response to frontend
            res.json({
                success: true,
                data: {
                    merchantCode: duitkuResponse.merchantCode,
                    merchantOrderId: merchantOrderId,
                    reference: duitkuResponse.reference,
                    paymentUrl: duitkuResponse.paymentUrl,
                    vaNumber: duitkuResponse.vaNumber || "",
                    qrString: duitkuResponse.qrString || "",
                    amount: String(Math.round(plan.price)),
                    statusCode: duitkuResponse.statusCode,
                    statusMessage: duitkuResponse.statusMessage
                }
            });
    
        } catch (error) {
            console.error('[Payment] Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async handleCallback(req, res) {
        try {
            console.log('[Payment Callback] Received callback data:', req.body);

            // Extract callback parameters
            const {
                merchantCode,
                amount,
                merchantOrderId,
                signature,
                resultCode,
                reference,
                productDetail,
                additionalParam,
                paymentCode,
                merchantUserId
            } = req.body;

            // Validate required parameters
            if (!merchantCode || !amount || !merchantOrderId || !signature) {
                console.error('[Payment Callback] Missing required parameters');
                return res.status(400).send('FAILED');
            }

            // Validate merchant code
            if (merchantCode !== process.env.DUITKU_MERCHANT_CODE) {
                console.error('[Payment Callback] Invalid merchant code:', merchantCode);
                return res.status(400).send('FAILED');
            }

            // Generate and verify signature
            const expectedSignature = crypto
                .createHash('md5')
                .update(merchantCode + amount + merchantOrderId + process.env.DUITKU_API_KEY)
                .digest('hex');

            if (signature !== expectedSignature) {
                console.error('[Payment Callback] Invalid signature');
                return res.status(400).send('FAILED');
            }

            // Find payment record
            const payment = await Payment.findByMerchantOrderId(merchantOrderId);
            if (!payment) {
                console.error('[Payment Callback] Payment not found:', merchantOrderId);
                return res.status(404).send('FAILED');
            }

            // Determine new payment status
            let newStatus;
            switch (resultCode) {
                case '00':
                    newStatus = 'paid';
                    break;
                case '01':
                    newStatus = 'failed';
                    break;
                case '02':
                    newStatus = 'expired';
                    break;
                default:
                    newStatus = 'pending';
            }

            // Log payment status change
            console.log('[Payment Callback] Updating payment status:', {
                merchantOrderId,
                oldStatus: payment.status,
                newStatus,
                resultCode
            });

            // Update payment record
            const updateData = {
                status: newStatus,
                status_code: resultCode,
                reference: reference,
                paid_time: newStatus === 'paid' ? new Date() : null,
                payment_details: JSON.stringify({
                    productDetail,
                    additionalParam,
                    paymentCode,
                    merchantUserId,
                    lastUpdate: new Date().toISOString(),
                    callbackData: req.body
                })
            };

            await Payment.updateByMerchantOrderId(merchantOrderId, updateData);

            // If payment is successful, activate the plan
            if (newStatus === 'paid') {
                try {
                    await this.activateUserPlan(payment.user_id, payment.plan_id);
                    console.log('[Payment Callback] Plan activated successfully:', {
                        userId: payment.user_id,
                        planId: payment.plan_id
                    });
                } catch (error) {
                    console.error('[Payment Callback] Error activating plan:', error);
                }
            }

            // Return OK to Duitku
            res.send('OK');

        } catch (error) {
            console.error('[Payment Callback] Error processing callback:', error);
            // Still return OK to avoid duplicate callbacks
            res.send('OK');
        }
    }
    
    // Helper method untuk aktivasi plan
    async activateUserPlan(userId, planId) {
        const connection = await pool.getConnection();
        try {
            const plan = await Plan.findById(planId);
            if (!plan) {
                throw new Error('Plan not found');
            }

            await connection.beginTransaction();

            // Create plan transaction record
            await connection.query(
                `INSERT INTO plan_transactions 
                (user_id, plan_id, transaction_type, amount, payment_method, payment_status, messages_added)
                VALUES (?, ?, 'purchase', ?, 'online', 'completed', ?)`,
                [userId, planId, plan.price, plan.message_limit]
            );

            // Update or create user plan
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
    }

    async checkTransactionStatus(req, res) {
        try {
            const { merchantOrderId } = req.params;

            // Get payment record
            const payment = await Payment.findByMerchantOrderId(merchantOrderId);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }

            // Check if payment is already paid
            if (payment.status === 'paid') {
                return res.json({
                    success: true,
                    data: {
                        merchantOrderId: payment.merchant_order_id,
                        reference: payment.reference,
                        amount: payment.amount,
                        status: payment.status,
                        paidTime: payment.paid_time
                    }
                });
            }

            // Check status with Duitku
            const duitkuStatus = await PaymentService.checkTransactionStatus({
                merchantOrderId: merchantOrderId,
                merchantCode: payment.merchant_code || process.env.DUITKU_MERCHANT_CODE
            });

            console.log('[Payment] Duitku status response:', duitkuStatus);

            // Update payment status based on Duitku response
            let newStatus;
            if (duitkuStatus.statusCode === '00' || duitkuStatus.statusCode === '00') {
                newStatus = 'paid';
            } else if (duitkuStatus.statusCode === '01') {
                newStatus = 'failed';
            } else if (duitkuStatus.statusCode === '02') {
                newStatus = 'expired';
            } else {
                newStatus = 'pending';
            }

            // Update payment record
            const updateData = {
                status: newStatus,
                status_code: duitkuStatus.statusCode,
                status_message: duitkuStatus.statusMessage,
                reference: duitkuStatus.reference,
                paid_time: newStatus === 'paid' ? new Date() : null,
                payment_details: JSON.stringify({
                    ...JSON.parse(payment.payment_details || '{}'),
                    lastCheck: new Date().toISOString(),
                    duitkuResponse: duitkuStatus
                })
            };

            await Payment.updateByMerchantOrderId(merchantOrderId, updateData);

            // If payment is successful, activate the plan
            if (newStatus === 'paid') {
                await this.activateUserPlan(payment.user_id, payment.plan_id);
            }

            res.json({
                success: true,
                data: {
                    merchantOrderId: payment.merchant_order_id,
                    reference: duitkuStatus.reference,
                    amount: payment.amount,
                    status: newStatus,
                    statusCode: duitkuStatus.statusCode,
                    statusMessage: duitkuStatus.statusMessage,
                    paidTime: updateData.paid_time
                }
            });

        } catch (error) {
            console.error('[Payment] Status check error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check payment status',
                details: error.message
            });
        }
    }

    async pollTransactionStatus(req, res) {
        try {
            const { merchantOrderId } = req.params;
            const maxAttempts = 12; // 2 minutes with 10-second intervals
            let currentAttempt = 0;

            const payment = await Payment.findByMerchantOrderId(merchantOrderId);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }

            // If payment is already paid, return immediately
            if (payment.status === 'paid') {
                return res.json({
                    success: true,
                    data: {
                        status: 'paid',
                        merchantOrderId: payment.merchant_order_id,
                        reference: payment.reference
                    }
                });
            }

            const checkStatus = async () => {
                currentAttempt++;
                
                try {
                    const duitkuStatus = await PaymentService.checkTransactionStatus({
                        merchantOrderId: merchantOrderId,
                        merchantCode: payment.merchant_code
                    });

                    if (duitkuStatus.statusCode === '00') {
                        // Update payment status
                        const updateData = {
                            status: 'paid',
                            status_code: duitkuStatus.statusCode,
                            status_message: duitkuStatus.statusMessage,
                            reference: duitkuStatus.reference,
                            paid_time: new Date(),
                            payment_details: JSON.stringify({
                                ...JSON.parse(payment.payment_details || '{}'),
                                lastCheck: new Date().toISOString(),
                                duitkuResponse: duitkuStatus
                            })
                        };

                        await Payment.updateByMerchantOrderId(merchantOrderId, updateData);
                        await this.activateUserPlan(payment.user_id, payment.plan_id);

                        return {
                            success: true,
                            data: {
                                status: 'paid',
                                merchantOrderId: payment.merchant_order_id,
                                reference: duitkuStatus.reference
                            }
                        };
                    }

                    if (currentAttempt >= maxAttempts) {
                        return {
                            success: false,
                            error: 'Payment timeout'
                        };
                    }

                    // Wait 10 seconds before next attempt
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    return await checkStatus();

                } catch (error) {
                    console.error('[Payment] Polling error:', error);
                    throw error;
                }
            };

            const result = await checkStatus();
            res.json(result);

        } catch (error) {
            console.error('[Payment] Polling error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to poll payment status',
                details: error.message
            });
        }
    }
}

module.exports = new PaymentController();