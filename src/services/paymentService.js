// src/services/paymentService.js

const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

class DuitkuPaymentService {
    constructor() {
        // Validate environment variables
        const requiredEnvVars = {
            DUITKU_MERCHANT_CODE: process.env.DUITKU_MERCHANT_CODE,
            DUITKU_API_KEY: process.env.DUITKU_API_KEY,
            DUITKU_CALLBACK_URL: process.env.DUITKU_CALLBACK_URL,
            FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
            BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000'
        };

        const missingVars = Object.entries(requiredEnvVars)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        // Initialize properties
        this.merchantCode = process.env.DUITKU_MERCHANT_CODE;
        this.apiKey = process.env.DUITKU_API_KEY;
        this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        this.backendUrl = process.env.BACKEND_URL;
        this.baseUrl = process.env.DUITKU_BASE_URL || 'https://sandbox.duitku.com/webapi/api/merchant';
        this.callbackUrl = process.env.DUITKU_CALLBACK_URL || `${process.env.BACKEND_URL || 'https://6db4-2404-c0-5c60-00-6ee-79dd.ngrok-free.app'}/api/payments/callback`;
        this.returnBaseUrl = `${this.frontendUrl}/redirect`;


        // Initialize axios instance
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false // for sandbox environment
            })
        });

        // Add logging interceptors
        this.axiosInstance.interceptors.request.use(
            (config) => {
                console.log('[Duitku] Request:', {
                    url: config.url,
                    method: config.method,
                    data: this.sanitizeLogData(config.data)
                });
                return config;
            },
            (error) => {
                console.error('[Duitku] Request Error:', error);
                return Promise.reject(error);
            }
        );

        this.axiosInstance.interceptors.response.use(
            (response) => {
                console.log('[Duitku] Response:', {
                    status: response.status,
                    data: this.sanitizeLogData(response.data)
                });
                return response;
            },
            (error) => {
                console.error('[Duitku] Response Error:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                return Promise.reject(error);
            }
        );
    }

    sanitizeLogData(data) {
        if (!data || typeof data !== 'object') return data;
        const sanitized = { ...data };
        
        // Mask sensitive fields
        const sensitiveFields = ['signature', 'apiKey', 'email', 'phoneNumber'];
        for (const field of sensitiveFields) {
            if (sanitized[field]) sanitized[field] = '***';
        }
        
        return sanitized;
    }

    generateSignature(params) {
        const signatureString = `${this.merchantCode}${params.merchantOrderId}${params.amount}${this.apiKey}`;
        return crypto.createHash('md5').update(signatureString).digest('hex');
    }

    async createTransaction(params) {
        try {
            const { 
                merchantOrderId,
                paymentMethod,
                amount,
                productDetails,
                email,
                customerName
            } = params;

            const signature = this.generateSignature({
                merchantOrderId,
                amount
            });

            // Prepare return URL with all necessary parameters
            const returnUrl = `${this.returnBaseUrl}?merchantOrderId=${merchantOrderId}`;

            const payload = {
                merchantCode: this.merchantCode,
                paymentAmount: amount,
                paymentMethod: paymentMethod,
                merchantOrderId: merchantOrderId,
                productDetails: productDetails,
                email: email,
                customerVaName: customerName,
                callbackUrl: this.callbackUrl,
                returnUrl: returnUrl,
                signature: signature
            };

            console.log('[Duitku] Creating transaction:', {
                ...payload,
                signature: '***',
                callbackUrl: this.callbackUrl,
                returnUrl: returnUrl
            });

            const response = await this.axiosInstance.post('/v2/inquiry', payload);

            // Save and return full response data
            return {
                merchantCode: this.merchantCode,
                reference: response.data.reference,
                paymentUrl: response.data.paymentUrl,
                vaNumber: response.data.vaNumber || "",
                qrString: response.data.qrString || "",
                amount: String(amount),
                statusCode: response.data.statusCode || "00",
                statusMessage: response.data.statusMessage || "SUCCESS"
            };

        } catch (error) {
            console.error('[Duitku] Transaction error:', error.response?.data || error);
            throw error;
        }
    }

    async checkTransactionStatus(params) {
        try {
            const { merchantOrderId } = params;

            const signature = this.generateSignature({
                merchantOrderId,
                amount: 0 // Not needed for status check
            });

            const payload = {
                merchantCode: this.merchantCode,
                merchantOrderId,
                signature
            };

            const response = await this.axiosInstance.post('/transactionStatus', payload);

            return {
                reference: response.data.reference,
                amount: response.data.amount,
                statusCode: response.data.statusCode,
                statusMessage: response.data.statusMessage,
                settlementDate: response.data.settlementDate || null
            };

        } catch (error) {
            console.error('[Duitku] Status check error:', error);
            throw error;
        }
    }
}

module.exports = new DuitkuPaymentService();