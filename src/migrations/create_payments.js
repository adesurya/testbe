// src/migrations/create_payments.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createPaymentTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Create payments table with integer amount
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                plan_id INT NOT NULL,
                merchant_order_id VARCHAR(255) NOT NULL UNIQUE,
                reference VARCHAR(255),
                amount INT NOT NULL, -- Changed from DECIMAL to INT
                payment_method VARCHAR(50),
                payment_url TEXT,
                status ENUM('pending', 'paid', 'expired', 'failed') DEFAULT 'pending',
                expiry_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (plan_id) REFERENCES plans(id)
            )
        `);
        console.log('Payments table created successfully');

    } catch (error) {
        console.error('Error creating payment tables:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

createPaymentTables();