// src/services/paymentService.js

const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

class DuitkuPaymentService {
    constructor() {
        this.merchantCode = process.env.DUITKU_MERCHANT_CODE;
        this.apiKey = process.env.DUITKU_API_KEY;
        this.baseUrl = process.env.DUITKU_BASE_URL || 'https://sandbox.duitku.com/webapi/api/merchant';
        this.callbackUrl = process.env.DUITKU_CALLBACK_URL;
        this.returnUrl = process.env.DUITKU_RETURN_URL;
        
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
    }

    generateSignature(params) {
        const signatureString = `${this.merchantCode}${params.merchantOrderId}${params.paymentAmount}${this.apiKey}`;
        return crypto.createHash('md5').update(signatureString).digest('hex');
    }

    async createTransaction(params) {
        try {
            const { 
                merchantOrderId,
                paymentAmount,
                paymentMethod,
                productDetails,
                email,
                phoneNumber,
                customerVaName
            } = params;

            const signature = this.generateSignature({
                merchantOrderId,
                paymentAmount
            });

            const payload = {
                merchantCode: this.merchantCode,
                paymentAmount: paymentAmount,
                paymentMethod: paymentMethod,
                merchantOrderId: merchantOrderId,
                productDetails: productDetails,
                email: email,
                phoneNumber: phoneNumber || '',
                additionalParam: '',
                merchantUserInfo: '',
                customerVaName: customerVaName,
                callbackUrl: this.callbackUrl,
                returnUrl: this.returnUrl,
                signature: signature
            };

            console.log('[Duitku] Sending request:', {
                ...payload,
                signature: '***'
            });

            const response = await this.axiosInstance.post('/v2/inquiry', payload);
            
            console.log('[Duitku] Received response:', response.data);

            // Format response according to Duitku specification
            return {
                merchantCode: this.merchantCode,
                reference: response.data.reference,
                paymentUrl: response.data.paymentUrl,
                vaNumber: response.data.vaNumber || "",
                qrString: response.data.qrString || "",
                amount: String(paymentAmount),
                statusCode: "00",
                statusMessage: "SUCCESS"
            };

        } catch (error) {
            console.error('[Duitku] Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.Message || error.message);
        }
    }
}

module.exports = new DuitkuPaymentService();