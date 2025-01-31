// src/config/paymentMethods.js

/**
 * Payment method configuration for the application
 */
const PAYMENT_METHODS = {
    // Virtual Account Methods
    BC: {
        code: 'BC',
        name: 'BCA Virtual Account',
        type: 'virtual_account',
        minAmount: 10000,
        maxAmount: 999999999
    },
    M2: {
        code: 'M2',
        name: 'Mandiri Virtual Account',
        type: 'virtual_account',
        minAmount: 10000,
        maxAmount: 999999999
    },
    VA: {
        code: 'VA',
        name: 'Maybank Virtual Account',
        type: 'virtual_account',
        minAmount: 10000,
        maxAmount: 999999999
    },
    B1: {
        code: 'B1',
        name: 'CIMB Virtual Account',
        type: 'virtual_account',
        minAmount: 10000,
        maxAmount: 999999999
    },
    BT: {
        code: 'BT',
        name: 'Permata Virtual Account',
        type: 'virtual_account',
        minAmount: 10000,
        maxAmount: 999999999
    },

    // E-Wallet Methods
    OV: {
        code: 'OV',
        name: 'OVO',
        type: 'ewallet',
        minAmount: 10000,
        maxAmount: 10000000
    },
    DA: {
        code: 'DA',
        name: 'DANA',
        type: 'ewallet',
        minAmount: 10000,
        maxAmount: 10000000
    },

    // QRIS Methods
    SP: {
        code: 'SP',
        name: 'ShopeePay QRIS',
        type: 'qris',
        minAmount: 1000,
        maxAmount: 5000000
    }
};

/**
 * Helper functions for payment methods
 */
class PaymentMethodHelper {
    /**
     * Get all available payment methods
     */
    static getAllMethods() {
        return PAYMENT_METHODS;
    }

    /**
     * Get payment method by code
     * @param {string} code - Payment method code
     */
    static getMethod(code) {
        return PAYMENT_METHODS[code];
    }

    /**
     * Validate if payment method is valid
     * @param {string} code - Payment method code
     * @param {number} amount - Transaction amount
     */
    static validateMethod(code, amount) {
        const method = this.getMethod(code);
        
        if (!method) {
            return {
                isValid: false,
                error: 'Invalid payment method'
            };
        }

        if (amount < method.minAmount) {
            return {
                isValid: false,
                error: `Minimum amount for ${method.name} is Rp${method.minAmount.toLocaleString()}`
            };
        }

        if (amount > method.maxAmount) {
            return {
                isValid: false,
                error: `Maximum amount for ${method.name} is Rp${method.maxAmount.toLocaleString()}`
            };
        }

        return {
            isValid: true,
            method
        };
    }

    /**
     * Get payment methods by type
     * @param {string} type - Payment method type (virtual_account, ewallet, qris)
     */
    static getMethodsByType(type) {
        return Object.values(PAYMENT_METHODS).filter(method => method.type === type);
    }

    /**
     * Format payment method for display
     * @param {string} code - Payment method code
     */
    static formatMethodDisplay(code) {
        const method = this.getMethod(code);
        if (!method) return null;

        return {
            code: method.code,
            name: method.name,
            type: method.type,
            limits: {
                min: method.minAmount,
                max: method.maxAmount,
                minFormatted: `Rp${method.minAmount.toLocaleString()}`,
                maxFormatted: `Rp${method.maxAmount.toLocaleString()}`
            }
        };
    }
}

module.exports = {
    PAYMENT_METHODS,
    PaymentMethodHelper
};