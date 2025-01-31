// src/services/paymentService.js

const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

class PaymentService {
    constructor() {
        this.merchantCode = process.env.DUITKU_MERCHANT_CODE;
        this.apiKey = process.env.DUITKU_API_KEY;
        this.baseUrl = process.env.DUITKU_BASE_URL || 'https://sandbox.duitku.com/webapi/api/merchant';
        this.callbackUrl = process.env.FRONTEND_URL + '/api/payments/callback';
        this.returnUrl = process.env.FRONTEND_URL + '/api/payments/return';
    }

    generateSignature(merchantCode, amount, datetime, apiKey) {
        const signatureText = merchantCode + amount + datetime + apiKey;
        return crypto.createHash('sha256').update(signatureText).digest('hex');
    }


    async getPaymentMethods({ amount }) {
        try {
            const datetime = moment().format('YYYY-MM-DD HH:mm:ss');
            const signature = crypto.createHash('sha256')
                .update(this.merchantCode + amount + datetime + this.apiKey)
                .digest('hex');

            const payload = {
                merchantCode: this.merchantCode,
                amount: amount,
                datetime: datetime,
                signature: signature
            };

            const response = await axios.post(`${this.baseUrl}/paymentmethod/getpaymentmethod`, payload);
            return response.data;
        } catch (error) {
            console.error('Error getting payment methods:', error.response?.data || error);
            throw error;
        }
    }

    async createTransaction(data) {
        try {
            const merchantOrderId = moment().format('x'); // timestamp
            const signature = crypto.createHash('md5')
                .update(this.merchantCode + merchantOrderId + data.amount + this.apiKey)
                .digest('hex');

            const payload = {
                merchantCode: this.merchantCode,
                paymentAmount: data.amount,
                paymentMethod: data.paymentMethod,
                merchantOrderId: merchantOrderId,
                productDetails: data.productDetails,
                customerVaName: data.customerName,
                email: data.email,
                phoneNumber: data.phoneNumber,
                callbackUrl: this.callbackUrl,
                returnUrl: this.returnUrl,
                signature: signature,
                expiryPeriod: 60, // 1 hour expiry
                customerDetail: {
                    firstName: data.customerName,
                    email: data.email,
                    phoneNumber: data.phoneNumber,
                    billingAddress: {
                        firstName: data.customerName,
                        phone: data.phoneNumber,
                        countryCode: "ID"
                    }
                }
            };

            const response = await axios.post(`${this.baseUrl}/v2/inquiry`, payload);
            return {
                ...response.data,
                merchantOrderId
            };
        } catch (error) {
            console.error('Error creating transaction:', error.response?.data || error);
            throw error;
        }
    }

    async createPaymentRequest(paymentData) {
        try {
            const merchantOrderId = moment().valueOf().toString(); // timestamp as order ID
            const signature = this.generateSignature({
                merchantOrderId: merchantOrderId,
                amount: paymentData.amount
            }, 'md5');

            const payload = {
                merchantCode: this.merchantCode,
                paymentAmount: paymentData.amount,
                paymentMethod: paymentData.paymentMethod,
                merchantOrderId: merchantOrderId,
                productDetails: `Payment for ${paymentData.planName}`,
                email: paymentData.email,
                phoneNumber: paymentData.phoneNumber,
                customerVaName: paymentData.customerName,
                callbackUrl: this.callbackUrl,
                returnUrl: this.returnUrl,
                signature: signature,
                expiryPeriod: 60, // 1 hour
                customerDetail: {
                    firstName: paymentData.customerName,
                    email: paymentData.email,
                    phoneNumber: paymentData.phoneNumber
                }
            };

            const response = await axios.post(`${this.baseUrl}/v2/inquiry`, payload);
            return {
                ...response.data,
                merchantOrderId
            };
        } catch (error) {
            console.error('Error creating payment:', error.response?.data || error.message);
            throw error;
        }
    }

    async checkPaymentStatus(merchantOrderId) {
        try {
            const signature = this.generateSignature({ merchantOrderId }, 'md5');

            const response = await axios.post(`${this.baseUrl}/transactionStatus`, {
                merchantCode: this.merchantCode,
                merchantOrderId: merchantOrderId,
                signature: signature
            });

            return response.data;
        } catch (error) {
            console.error('Error checking payment status:', error.response?.data || error.message);
            throw error;
        }
    }

    verifyCallback(callbackData) {
        const signature = this.generateSignature({
            merchantOrderId: callbackData.merchantOrderId,
            amount: callbackData.amount
        }, 'md5');

        return signature === callbackData.signature;
    }
}

module.exports = new PaymentService();