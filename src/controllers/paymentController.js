// src/controllers/paymentController.js
const Plan = require('../models/Plan'); // Tambahkan import Plan
const PaymentService = require('../services/paymentService');
const Payment = require('../models/Payment');


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

            const paymentMethods = await PaymentService.getPaymentMethods({
                amount: plan.price
            });

            res.json({
                success: true,
                data: paymentMethods
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Create Transaction
    async createTransaction(req, res) {
        try {
            const { planId, paymentMethod } = req.body;
            const plan = await Plan.findById(planId);
            
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    error: 'Plan not found'
                });
            }

            const transactionData = {
                amount: plan.price,
                paymentMethod: paymentMethod,
                productDetails: `Payment for ${plan.name} Plan`,
                customerName: req.user.username,
                email: req.user.email,
                phoneNumber: req.user.phone || ''
            };

            const transaction = await PaymentService.createTransaction(transactionData);

            // Save to our database
            await Payment.create({
                userId: req.user.id,
                planId: planId,
                merchantOrderId: transaction.merchantOrderId,
                amount: plan.price,
                paymentMethod: paymentMethod,
                paymentUrl: transaction.paymentUrl,
                status: 'pending',
                reference: transaction.reference
            });

            res.json({
                success: true,
                data: {
                    merchantOrderId: transaction.merchantOrderId,
                    reference: transaction.reference,
                    paymentUrl: transaction.paymentUrl
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }


    async createPayment(req, res) {
        try {
            const { planId, paymentMethod } = req.body;
            const userId = req.user.id;

            const plan = await Plan.getById(planId);
            if (!plan) {
                return res.status(404).json({ success: false, error: 'Plan not found' });
            }

            const paymentData = {
                amount: plan.price,
                paymentMethod,
                planName: plan.name,
                email: req.user.email,
                phoneNumber: req.user.phone || '',
                customerName: req.user.username
            };

            const duitkuResponse = await PaymentService.createPaymentRequest(paymentData);

            await Payment.create({
                userId,
                planId,
                merchantOrderId: duitkuResponse.merchantOrderId,
                reference: duitkuResponse.reference,
                amount: plan.price,
                paymentMethod,
                paymentUrl: duitkuResponse.paymentUrl,
                expiryTime: moment().add(1, 'hour').toDate()
            });

            res.json({
                success: true,
                data: {
                    paymentUrl: duitkuResponse.paymentUrl,
                    merchantOrderId: duitkuResponse.merchantOrderId,
                    reference: duitkuResponse.reference
                }
            });
        } catch (error) {
            console.error('Error creating payment:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleCallback(req, res) {
        try {
            const {
                merchantCode,
                amount,
                merchantOrderId,
                resultCode,
                reference
            } = req.body;

            // Handle payment
            const payment = await Payment.findByMerchantOrderId(merchantOrderId);
            if (!payment) {
                return res.status(404).send('Payment not found');
            }

            if (resultCode === '00') {
                await Payment.updateStatus(merchantOrderId, 'paid');
                await Plan.assignToUser(payment.userId, payment.planId);
            } else {
                await Payment.updateStatus(merchantOrderId, 'failed');
            }

            res.send('OK');
        } catch (error) {
            console.error('Callback error:', error);
            res.status(500).send('Error processing callback');
        }
    }

    async handleReturn(req, res) {
        const { merchantOrderId } = req.query;
        res.redirect(`${process.env.FRONTEND_URL}/payment/status/${merchantOrderId}`);
    }
}

module.exports = new PaymentController();