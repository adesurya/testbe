// src/services/paymentService.js
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

class PaymentService {
    constructor() {
        this.merchantCode = process.env.DUITKU_MERCHANT_CODE;
        this.apiKey = process.env.DUITKU_API_KEY;
        this.apiUrl = process.env.DUITKU_API_URL;
    }

    generateSignature(params) {
        const hash = crypto.createHash('sha256');
        return hash.update(params).digest('hex');
    }

    generateMD5Signature(params) {
        const hash = crypto.createHash('md5');
        return hash.update(params).digest('hex');
    }

    formatAmount(amount) {
        // Convert to integer by removing decimal points and converting to string
        return Math.round(amount).toString();
    }

    async getPaymentMethods(amount) {
        try {
            const formattedAmount = this.formatAmount(amount);
            const datetime = moment().format('YYYY-MM-DD HH:mm:ss');
            const signature = this.generateSignature(
                this.merchantCode + formattedAmount + datetime + this.apiKey
            );

            console.log('Getting payment methods with amount:', formattedAmount);

            const response = await axios.post(`${this.apiUrl}/paymentmethod/getpaymentmethod`, {
                merchantCode: this.merchantCode,
                amount: formattedAmount,
                datetime: datetime,
                signature: signature
            });

            return response.data;
        } catch (error) {
            console.error('Error getting payment methods:', error.response?.data || error.message);
            throw error;
        }
    }

    async createPaymentRequest(paymentData) {
        try {
            const formattedAmount = this.formatAmount(paymentData.amount);
            const merchantOrderId = moment().format('x');
            const signature = this.generateMD5Signature(
                this.merchantCode + merchantOrderId + formattedAmount + this.apiKey
            );

            console.log('Creating payment request with amount:', formattedAmount);

            const returnUrl = `${process.env.FRONTEND_URL}/api/payments/return`; // Gunakan endpoint API kita
            const callbackUrl = `${process.env.FRONTEND_URL}/api/payments/callback`;

            const paymentRequest = {
                merchantCode: this.merchantCode,
                paymentAmount: formattedAmount,
                paymentMethod: paymentData.paymentMethod,
                merchantOrderId: merchantOrderId,
                productDetails: `Payment for ${paymentData.planName}`,
                email: paymentData.email,
                phoneNumber: paymentData.phoneNumber,
                customerVaName: paymentData.customerName,
                callbackUrl: callbackUrl,
                returnUrl: returnUrl,
                signature: signature,
                expiryPeriod: 60 // 1 hour expiry
            };

            const response = await axios.post(`${this.apiUrl}/v2/inquiry`, paymentRequest);
            return { 
                ...response.data,
                merchantOrderId
            };
        } catch (error) {
            console.error('Error creating payment request:', error.response?.data || error.message);
            throw error;
        }
    }

    async checkPaymentStatus(merchantOrderId) {
        try {
            const signature = this.generateMD5Signature(
                this.merchantCode + merchantOrderId + this.apiKey
            );
    
            const response = await axios.post(
                `${this.apiUrl}/transactionStatus`,
                {
                    merchantCode: this.merchantCode,
                    merchantOrderId: merchantOrderId,
                    signature: signature
                }
            );
    
            console.log('Duitku payment status:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error checking payment status:', error.response?.data || error.message);
            throw error;
        }
    }

    verifyCallback(callbackData) {
        const signature = this.generateSignature(
            callbackData.merchantCode + 
            callbackData.amount + 
            callbackData.merchantOrderId + 
            this.apiKey
        );

        return signature === callbackData.signature;
    }
}

module.exports = new PaymentService();