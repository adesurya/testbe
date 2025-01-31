// src/services/paymentService.js
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

class DuitkuPaymentService {
    constructor() {
        // Validate required environment variables first
        const requiredEnvVars = {
            DUITKU_MERCHANT_CODE: process.env.DUITKU_MERCHANT_CODE,
            DUITKU_API_KEY: process.env.DUITKU_API_KEY,
            DUITKU_CALLBACK_URL: process.env.DUITKU_CALLBACK_URL,
            DUITKU_RETURN_URL: process.env.DUITKU_RETURN_URL
        };

        const missingVars = Object.entries(requiredEnvVars)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        this.baseUrl = process.env.DUITKU_BASE_URL || 'https://sandbox.duitku.com/webapi/api/merchant';
        this.merchantCode = process.env.DUITKU_MERCHANT_CODE;
        this.apiKey = process.env.DUITKU_API_KEY;
        this.callbackUrl = process.env.DUITKU_CALLBACK_URL;
        this.returnUrl = process.env.DUITKU_RETURN_URL;
        this.expiryPeriod = 60; // 1 hour expiry default

        // Setup axios instance with default config
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Add request interceptor for logging
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

        // Add response interceptor for logging
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
        const sensitiveFields = ['signature', 'apiKey', 'email', 'phoneNumber'];
        if (typeof data !== 'object' || data === null) return data;

        return Object.entries(data).reduce((acc, [key, value]) => {
            if (sensitiveFields.includes(key)) {
                acc[key] = '***';
            } else if (typeof value === 'object') {
                acc[key] = this.sanitizeLogData(value);
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});
    }

    generateSignature(params) {
        const { type, ...data } = params;
        let signatureString = '';

        try {
            switch (type) {
                case 'GET_PAYMENT_METHODS':
                    signatureString = `${this.merchantCode}${data.amount}${data.datetime}${this.apiKey}`;
                    console.log('[Duitku] Generating GET_PAYMENT_METHODS signature with:', {
                        merchantCode: this.merchantCode,
                        amount: data.amount,
                        datetime: data.datetime,
                        signatureString: '***'
                    });
                    return crypto.createHash('sha256').update(signatureString).digest('hex');

                case 'CREATE_TRANSACTION':
                    signatureString = `${this.merchantCode}${data.merchantOrderId}${data.amount}${this.apiKey}`;
                    console.log('[Duitku] Generating CREATE_TRANSACTION signature with:', {
                        merchantCode: this.merchantCode,
                        merchantOrderId: data.merchantOrderId,
                        amount: data.amount,
                        signatureString: '***'
                    });
                    return crypto.createHash('md5').update(signatureString).digest('hex');

                default:
                    throw new Error(`Invalid signature type: ${type}`);
            }
        } catch (error) {
            console.error('[Duitku] Error generating signature:', error);
            throw error;
        }
    }

    async createTransaction(params) {
        try {
            const merchantOrderId = moment().format('YYYYMMDDHHmmss') + Math.random().toString(36).substring(2, 7);
            const amount = Math.round(params.amount); // Ensure amount is integer
            
            const signature = this.generateSignature({
                type: 'CREATE_TRANSACTION',
                merchantOrderId,
                amount
            });

            console.log('[Duitku] Creating transaction:', {
                merchantOrderId,
                amount,
                paymentMethod: params.paymentMethod
            });

            const payload = {
                merchantCode: this.merchantCode,
                merchantOrderId,
                paymentAmount: amount,
                paymentMethod: params.paymentMethod,
                productDetails: params.productDetails,
                email: params.email,
                customerVaName: params.customerName,
                callbackUrl: this.callbackUrl,
                returnUrl: this.returnUrl,
                signature
            };

            const response = await this.axiosInstance.post('/v2/inquiry', payload);

            if (!response.data || !response.data.paymentUrl) {
                throw new Error('Invalid response from Duitku');
            }

            return {
                ...response.data,
                merchantOrderId
            };
        } catch (error) {
            console.error('[Duitku] Transaction creation error:', {
                error: error.message,
                response: error.response?.data,
                stack: error.stack
            });

            if (error.response?.status === 401) {
                throw new DuitkuPaymentError(
                    'Authentication failed. Please check MERCHANT_CODE and API_KEY.',
                    error
                );
            }

            throw new DuitkuPaymentError(
                error.response?.data?.Message || 'Failed to create transaction',
                error
            );
        }
    }

    async checkTransactionStatus(merchantOrderId) {
        try {
            const signature = this.generateSignature({
                type: 'CHECK_TRANSACTION',
                merchantOrderId
            });

            const response = await this.axiosInstance.post('/transactionStatus', {
                merchantCode: this.merchantCode,
                merchantOrderId,
                signature
            });

            return response.data;
        } catch (error) {
            console.error('[Duitku] Status check error:', {
                merchantOrderId,
                error: error.message,
                response: error.response?.data
            });
            throw new DuitkuPaymentError('Failed to check transaction status', error);
        }
    }
}

class DuitkuPaymentError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'DuitkuPaymentError';
        this.originalError = originalError;
    }
}

module.exports = new DuitkuPaymentService();