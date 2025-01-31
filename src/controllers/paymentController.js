// src/controllers/paymentController.js
const PaymentService = require('../services/paymentService');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');

class PaymentController {
    async getPaymentMethods(req, res) {
        try {
            const { planId } = req.params;
            const plan = await Plan.findById(planId);
            
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    error: 'Plan not found'
                });
            }

            const paymentMethods = await PaymentService.getPaymentMethods(plan.price);

            res.json({
                success: true,
                data: paymentMethods
            });
        } catch (error) {
            console.error('Error getting payment methods:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async createTransaction(req, res) {
        const logContext = {
            endpoint: 'createTransaction',
            requestId: Date.now().toString()
        };
        
        console.log('[Payment] Starting transaction creation:', logContext);
        
        try {
            const { planId, paymentMethod } = req.body;
            const user = req.user;

            // Validate required fields
            if (!planId || !paymentMethod) {
                return res.status(400).json({
                    success: false,
                    error: 'planId and paymentMethod are required'
                });
            }

            console.log('[Payment] Fetching plan details:', { planId });
            const plan = await Plan.findById(planId);
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    error: 'Plan not found'
                });
            }

            const transactionData = {
                amount: plan.price,
                paymentMethod,
                productDetails: `Payment for ${plan.name} Plan`,
                customerName: user.username,
                email: user.email,
                phoneNumber: user.phone || '',
                items: [{
                    name: plan.name,
                    price: plan.price,
                    quantity: 1
                }]
            };

            console.log('[Payment] Creating Duitku transaction:', { 
                ...logContext,
                transactionData: {
                    ...transactionData,
                    email: '***@***.com' // Mask sensitive data in logs
                }
            });

            const transaction = await PaymentService.createTransaction(transactionData);

            console.log('[Payment] Transaction created successfully:', {
                ...logContext,
                merchantOrderId: transaction.merchantOrderId,
                reference: transaction.reference
            });

            // Save payment record to database
            await Payment.create({
                userId: user.id,
                planId: planId,
                merchantOrderId: transaction.merchantOrderId,
                reference: transaction.reference,
                amount: plan.price,
                paymentMethod: paymentMethod,
                paymentUrl: transaction.paymentUrl,
                status: 'pending',
                expiryTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
            });

            res.json({
                success: true,
                data: {
                    merchantOrderId: transaction.merchantOrderId,
                    reference: transaction.reference,
                    paymentUrl: transaction.paymentUrl,
                    expiryTime: transaction.expiredDate || null
                }
            });
        } catch (error) {
            console.error('[Payment] Error creating transaction:', {
                ...logContext,
                error: error.message,
                stack: error.stack,
                originalError: error.originalError || {},
                requestBody: req.body
            });
            
            res.status(500).json({
                success: false,
                error: 'Failed to create transaction',
                details: error.message,
                code: error.response?.status || 500,
                requestId: logContext.requestId
            });
        }
    }

    async getPaymentStatus(req, res) {
        try {
            const { merchantOrderId } = req.params;
            
            const payment = await Payment.findByMerchantOrderId(merchantOrderId);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }

            // Verify user authorization
            if (payment.userId !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized access'
                });
            }

            // Get real-time status from Duitku
            const duitkuStatus = await PaymentService.checkTransactionStatus(merchantOrderId);

            // Update local status if needed
            if (duitkuStatus.statusCode === '00' && payment.status !== 'paid') {
                await Payment.updateStatus(merchantOrderId, 'paid');
                await Plan.assignToUser(payment.userId, payment.planId);
            }

            res.json({
                success: true,
                data: {
                    merchantOrderId: payment.merchantOrderId,
                    reference: payment.reference,
                    amount: payment.amount,
                    status: payment.status,
                    paymentMethod: payment.paymentMethod,
                    createdAt: payment.createdAt,
                    expiryTime: payment.expiryTime,
                    duitkuStatus: duitkuStatus
                }
            });
        } catch (error) {
            console.error('Error getting payment status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get payment status',
                details: error.message
            });
        }
    }

    async handleCallback(req, res) {
        const logContext = {
            endpoint: 'handleCallback',
            requestId: Date.now().toString()
        };

        try {
            const callbackData = req.body;
            console.log('[Payment] Received callback:', {
                ...logContext,
                callbackData: {
                    ...callbackData,
                    signature: '***' // Mask sensitive data
                }
            });

            // Verify callback authenticity
            const isValid = PaymentService.verifyCallback(callbackData);
            if (!isValid) {
                console.warn('[Payment] Invalid callback signature:', {
                    ...logContext,
                    merchantOrderId: callbackData.merchantOrderId
                });
                return res.status(400).send('Invalid callback signature');
            }

            const payment = await Payment.findByMerchantOrderId(callbackData.merchantOrderId);
            if (!payment) {
                console.warn('[Payment] Payment not found:', {
                    ...logContext,
                    merchantOrderId: callbackData.merchantOrderId
                });
                return res.status(404).send('Payment not found');
            }

            // Process payment status
            switch (callbackData.resultCode) {
                case '00':
                    console.log('[Payment] Processing successful payment:', {
                        ...logContext,
                        merchantOrderId: callbackData.merchantOrderId
                    });
                    await Payment.updateStatus(payment.merchantOrderId, 'paid', callbackData);
                    await Plan.assignToUser(payment.userId, payment.planId);
                    break;
                    
                case '01':
                    console.log('[Payment] Processing failed payment:', {
                        ...logContext,
                        merchantOrderId: callbackData.merchantOrderId
                    });
                    await Payment.updateStatus(payment.merchantOrderId, 'failed', callbackData);
                    break;
                    
                default:
                    console.warn('[Payment] Unhandled payment result code:', {
                        ...logContext,
                        merchantOrderId: callbackData.merchantOrderId,
                        resultCode: callbackData.resultCode
                    });
                    await Payment.updateStatus(payment.merchantOrderId, 'failed', callbackData);
            }

            res.send('OK');
        } catch (error) {
            console.error('[Payment] Error handling callback:', {
                ...logContext,
                error: error.message,
                stack: error.stack
            });
            res.status(500).send('Error processing callback');
        }
    }

    async handleReturn(req, res) {
        const { merchantOrderId, resultCode } = req.query;
        const baseUrl = process.env.FRONTEND_URL;
        
        console.log('[Payment] Processing return URL:', {
            merchantOrderId,
            resultCode
        });

        try {
            const payment = await Payment.findByMerchantOrderId(merchantOrderId);
            if (!payment) {
                console.warn('[Payment] Payment not found for return URL:', { merchantOrderId });
                return res.redirect(`${baseUrl}/payment/failed?orderId=${merchantOrderId}`);
            }

            const duitkuStatus = await PaymentService.checkTransactionStatus(merchantOrderId);
            
            if (duitkuStatus.statusCode === '00') {
                console.log('[Payment] Redirecting to success page:', { merchantOrderId });
                return res.redirect(`${baseUrl}/payment/success?orderId=${merchantOrderId}`);
            } else {
                console.log('[Payment] Redirecting to failed page:', { merchantOrderId });
                return res.redirect(`${baseUrl}/payment/failed?orderId=${merchantOrderId}`);
            }
        } catch (error) {
            console.error('[Payment] Error handling return URL:', {
                merchantOrderId,
                error: error.message
            });
            return res.redirect(`${baseUrl}/payment/failed?orderId=${merchantOrderId}`);
        }
    }

    async getPaymentHistory(req, res) {
        try {
            const { page = 1, limit = 10, status } = req.query;
            const userId = req.user.id;

            const payments = await Payment.getUserPaymentHistory(userId, {
                page: parseInt(page),
                limit: parseInt(limit),
                status
            });

            res.json({
                success: true,
                data: payments.data,
                pagination: payments.pagination
            });
        } catch (error) {
            console.error('Error getting payment history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get payment history'
            });
        }
    }

    // Admin Methods

    async getAllPayments(req, res) {
        try {
            const { 
                page = 1, 
                limit = 10, 
                status, 
                startDate, 
                endDate 
            } = req.query;

            const filters = {
                status,
                startDate,
                endDate,
                page: parseInt(page),
                limit: parseInt(limit)
            };

            const payments = await Payment.getAllPayments(filters);

            res.json({
                success: true,
                data: payments.data,
                pagination: payments.pagination
            });
        } catch (error) {
            console.error('Error getting all payments:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get payments'
            });
        }
    }

    async getPaymentStatistics(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const stats = await Payment.getPaymentStatistics({ startDate, endDate });

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error getting payment statistics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get statistics'
            });
        }
    }

    async retryCallback(req, res) {
        try {
            const { merchantOrderId } = req.params;
            
            const payment = await Payment.findByMerchantOrderId(merchantOrderId);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }

            const status = await PaymentService.checkTransactionStatus(merchantOrderId);
            
            if (status.statusCode === '00') {
                await Payment.updateStatus(merchantOrderId, 'paid', status);
                await Plan.assignToUser(payment.userId, payment.planId);
            }

            res.json({
                success: true,
                message: 'Callback retry processed successfully',
                data: {
                    status: status,
                    payment: await Payment.findByMerchantOrderId(merchantOrderId)
                }
            });
        } catch (error) {
            console.error('Error retrying callback:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retry callback'
            });
        }
    }
}

module.exports = new PaymentController();