// src/controllers/paymentController.js
const Payment = require('../models/Payment');
const PaymentService = require('../services/paymentService');
const Plan = require('../models/Plan');

class PaymentController {
    async getPaymentMethods(req, res) {
        try {
            const { planId } = req.params;
            const plan = await Plan.getById(planId);
            
            if (!plan) {
                return res.status(404).json({ error: 'Plan not found' });
            }

            const paymentMethods = await PaymentService.getPaymentMethods(plan.price);
            res.json(paymentMethods);
        } catch (error) {
            console.error('Error getting payment methods:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async createPayment(req, res) {
        try {
            const { planId, paymentMethod } = req.body;
            const userId = req.user.id;

            // Get plan details
            const plan = await Plan.getById(planId);
            if (!plan) {
                return res.status(404).json({ error: 'Plan not found' });
            }

            // Create payment request to Duitku
            const paymentData = {
                amount: plan.price,
                paymentMethod: paymentMethod,
                planName: plan.name,
                email: req.user.email,
                phoneNumber: req.user.phone || '',
                customerName: req.user.username
            };

            const duitkuResponse = await PaymentService.createPaymentRequest(paymentData);

            // Save payment details
            await Payment.create({
                userId,
                planId,
                merchantOrderId: duitkuResponse.merchantOrderId,
                reference: duitkuResponse.reference,
                amount: plan.price,
                paymentMethod,
                paymentUrl: duitkuResponse.paymentUrl,
                expiryTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
            });

            res.json({
                paymentUrl: duitkuResponse.paymentUrl,
                merchantOrderId: duitkuResponse.merchantOrderId,
                reference: duitkuResponse.reference
            });
        } catch (error) {
            console.error('Error creating payment:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async handleCallback(req, res) {
        console.log('Callback received:', req.body);
        try {
            const { 
                merchantOrderId, 
                resultCode,
                amount,
                reference 
            } = req.body;

            // Ambil data payment
            const payment = await Payment.getByMerchantOrderId(merchantOrderId);
            if (!payment) {
                console.error('Payment not found:', merchantOrderId);
                return res.status(404).send('Payment not found');
            }

            // Update status berdasarkan resultCode
            let newStatus = 'pending';
            if (resultCode === '00') {
                newStatus = 'paid';
                
                // Jika payment sukses, assign plan ke user
                await Plan.assignToUser(payment.user_id, payment.plan_id, amount);
                console.log('Plan assigned to user:', payment.user_id);
            } else if (['01', '02'].includes(resultCode)) {
                newStatus = 'failed';
            }

            // Update payment status
            await Payment.updateStatus(merchantOrderId, newStatus, reference);
            console.log('Payment status updated to:', newStatus);

            res.send('OK');
        } catch (error) {
            console.error('Error handling callback:', error);
            res.status(500).send('Error processing callback');
        }
    }


    async handleReturn(req, res) {
        try {
            const { merchantOrderId } = req.query;
            
            // Check payment status from database
            const payment = await Payment.getByMerchantOrderId(merchantOrderId);
            if (!payment) {
                console.error('Payment not found:', merchantOrderId);
                return res.redirect(`/payment/error?message=Payment not found`);
            }

            // Double check with Duitku if status is still pending
            if (payment.status === 'pending') {
                const duitkuStatus = await PaymentService.checkPaymentStatus(merchantOrderId);
                if (duitkuStatus.statusCode === '00') {
                    // Update local status if Duitku shows payment is successful
                    await Payment.updateStatus(merchantOrderId, 'paid', duitkuStatus.reference);
                    await Plan.assignToUser(payment.user_id, payment.plan_id, payment.amount);
                    payment.status = 'paid';
                }
            }

            // Redirect based on final status
            if (payment.status === 'paid') {
                res.redirect(`/payment/success?orderId=${merchantOrderId}`);
            } else {
                res.redirect(`/payment/failed?orderId=${merchantOrderId}`);
            }
        } catch (error) {
            console.error('Error handling return:', error);
            res.redirect(`/payment/error?message=${encodeURIComponent(error.message)}`);
        }
    }

    async getPaymentDetail(req, res) {
        try {
            const { merchantOrderId } = req.params;
            
            // Get payment detail from database
            const payment = await Payment.getByMerchantOrderId(merchantOrderId);
            if (!payment) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            // If payment is still pending, check with Duitku
            if (payment.status === 'pending') {
                const duitkuStatus = await PaymentService.checkPaymentStatus(merchantOrderId);
                if (duitkuStatus.statusCode === '00' && payment.status !== 'paid') {
                    await Payment.updateStatus(merchantOrderId, 'paid', duitkuStatus.reference);
                    await Plan.assignToUser(payment.user_id, payment.plan_id, payment.amount);
                    payment.status = 'paid';
                }
            }

            const plan = await Plan.getById(payment.plan_id);

            res.json({
                status: 'success',
                data: {
                    merchantOrderId: payment.merchant_order_id,
                    reference: payment.reference,
                    amount: payment.amount,
                    status: payment.status,
                    paymentMethod: payment.payment_method,
                    createdAt: payment.created_at,
                    plan: {
                        name: plan.name,
                        messageLimit: plan.message_limit,
                        durationDays: plan.duration_days
                    }
                }
            });
        } catch (error) {
            console.error('Error getting payment detail:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async checkStatus(req, res) {
        try {
            const { merchantOrderId } = req.params;
            const status = await PaymentService.checkPaymentStatus(merchantOrderId);
            res.json(status);
        } catch (error) {
            console.error('Error checking payment status:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getPaymentHistory(req, res) {
        try {
            const userId = req.user.id;
            const payments = await Payment.getUserPayments(userId);
            res.json(payments);
        } catch (error) {
            console.error('Error getting payment history:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PaymentController();