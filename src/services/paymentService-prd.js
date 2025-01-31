// src/services/paymentService.js

const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');
const { PaymentMethodHelper } = require('../config/paymentMethods');

class DuitkuPaymentService {
    constructor() {
        this.validateEnvironmentVariables();
        this.initializeService();
    }

    validateEnvironmentVariables() {
        const requiredEnvVars = {
            DUITKU_MERCHANT_CODE: process.env.DUITKU_MERCHANT_CODE,
            DUITKU_API_KEY: process.env.DUITKU_API_KEY,
            DUITKU_CALLBACK_URL: process.env.DUITKU_CALLBACK_URL,
            DUITKU_RETURN_URL: process.env.DUITKU_RETURN_URL,
            DUITKU_BASE_URL: process.env.DUITKU_BASE_URL
        };

        const missingVars = Object.entries(requiredEnvVars)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
    }

    initializeService() {
        this.baseUrl = process.env.DUITKU_BASE_URL;
        this.merchantCode = process.env.DUITKU_MERCHANT_CODE;
        this.apiKey = process.env.DUITKU_API_KEY;
        this.callbackUrl = process.env.DUITKU_CALLBACK_URL;
        this.returnUrl = process.env.DUITKU_RETURN_URL;
        this.expiryPeriod = 60; // 1 hour expiry

        this.initializeAxios();
    }

    initializeAxios() {
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            httpsAgent: new (require('https').Agent)({  
                rejectUnauthorized: false
            })
        });

        // Add logging interceptors
        this.addAxiosInterceptors();
    }

    addAxiosInterceptors() {
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
        const sensitiveFields = ['signature', 'apiKey', 'email', 'phoneNumber'];
        if (typeof data !== 'object' || data === null) return data;

        return Object.entries(data).reduce((acc, [key, value]) => {
            acc[key] = sensitiveFields.includes(key) ? '***' : 
                      (typeof value === 'object' ? this.sanitizeLogData(value) : value);
            return acc;
        }, {});
    }

    async createTransaction(params) {
        try {
            // Validate payment method
            const validationResult = PaymentMethodHelper.validateMethod(
                params.paymentMethod,
                params.amount
            );

            if (!validationResult.isValid) {
                throw new Error(validationResult.error);
            }

            const merchantOrderId = this.generateMerchantOrderId();
            const amount = Math.round(params.amount);
            const signature = this.generateSignature({
                type: 'CREATE_TRANSACTION',
                merchantOrderId,
                amount
            });

            const payload = {
                merchantCode: this.merchantCode,
                merchantOrderId,
                paymentAmount: amount,
                paymentMethod: params.paymentMethod,
                productDetails: params.productDetails,
                email: params.email,
                customerVaName: params.customerName,
                phoneNumber: params.phoneNumber || '',
                additionalParam: '',
                merchantUserInfo: params.userId || '',
                customerDetail: {
                    firstName: params.customerName,
                    email: params.email,
                    phoneNumber: params.phoneNumber || ''
                },
                callbackUrl: this.callbackUrl,
                returnUrl: this.returnUrl,
                signature
            };

            const response = await this.axiosInstance.post('/v2/inquiry', payload);

            if (!response.data || !response.data.paymentUrl) {
                throw new Error('Invalid response from Duitku');
            }

            return {
                merchantOrderId,
                reference: response.data.reference,
                paymentUrl: response.data.paymentUrl,
                amount: amount,
                paymentMethod: params.paymentMethod,
                expiryTime: moment().add(this.expiryPeriod, 'minutes').toDate()
            };

        } catch (error) {
            console.error('[Duitku] Transaction creation error:', {
                error: error.message,
                response: error.response?.data,
                stack: error.stack
            });

            if (error.response?.status === 401) {
                throw new DuitkuPaymentError(
                    'Authentication failed. Please check merchant configuration.',
                    error
                );
            }

            throw new DuitkuPaymentError(
                error.response?.data?.Message || 'Failed to create transaction',
                error
            );
        }
    }

    generateMerchantOrderId() {
        return moment().format('YYMMDDHHmmss') + 
               Math.random().toString(36).substring(2, 7).toUpperCase();
    }

    generateSignature(params) {
        const { type, ...data } = params;
        let signatureString = '';

        try {
            switch (type) {
                case 'CREATE_TRANSACTION':
                    signatureString = `${this.merchantCode}${data.merchantOrderId}${data.amount}${this.apiKey}`;
                    return crypto.createHash('md5').update(signatureString).digest('hex');

                case 'CHECK_TRANSACTION':
                    signatureString = `${this.merchantCode}${data.merchantOrderId}${this.apiKey}`;
                    return crypto.createHash('md5').update(signatureString).digest('hex');

                default:
                    throw new Error(`Invalid signature type: ${type}`);
            }
        } catch (error) {
            console.error('[Duitku] Error generating signature:', error);
            throw error;
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

    verifyCallback(callbackData) {
        try {
            const { merchantCode, amount, merchantOrderId, signature } = callbackData;
            const expectedSignature = this.generateSignature({
                type: 'CREATE_TRANSACTION',
                merchantOrderId,
                amount
            });

            return signature === expectedSignature;
        } catch (error) {
            console.error('[Duitku] Callback verification error:', error);
            return false;
        }
    }

    async getPaymentMethods(amount) {
        try {
            const datetime = moment().format('YYYY-MM-DD HH:mm:ss');
            const signature = this.generateSignature({
                type: 'GET_PAYMENT_METHODS',
                amount,
                datetime
            });

            const response = await this.axiosInstance.post('/paymentMethod/getPaymentMethod', {
                merchantCode: this.merchantCode,
                amount,
                signature,
                datetime
            });

            if (!response.data || !response.data.paymentFee) {
                throw new Error('Invalid response from Duitku');
            }

            // Filter and format payment methods
            return response.data.paymentFee
                .filter(method => PaymentMethodHelper.getMethod(method.paymentMethod))
                .map(method => {
                    const methodInfo = PaymentMethodHelper.formatMethodDisplay(method.paymentMethod);
                    return {
                        ...methodInfo,
                        totalFee: method.totalFee,
                        fee: method.fee
                    };
                });

        } catch (error) {
            console.error('[Duitku] Error getting payment methods:', error);
            throw new DuitkuPaymentError('Failed to get payment methods', error);
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