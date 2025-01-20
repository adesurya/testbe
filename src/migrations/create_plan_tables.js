// src/migrations/create_plan_tables.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createPlanTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Create plans table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                message_limit INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                duration_days INT NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Plans table created successfully');

        // Create user_plans table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_plans (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                plan_id INT NOT NULL,
                messages_remaining INT NOT NULL,
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_date TIMESTAMP NOT NULL,
                status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (plan_id) REFERENCES plans(id)
            )
        `);
        console.log('User plans table created successfully');

        // Create plan_transactions table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS plan_transactions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                plan_id INT NOT NULL,
                transaction_type ENUM('purchase', 'topup') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_method ENUM('offline', 'online') DEFAULT 'offline',
                payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
                messages_added INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (plan_id) REFERENCES plans(id)
            )
        `);
        console.log('Plan transactions table created successfully');

    } catch (error) {
        console.error('Error creating plan tables:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

createPlanTables();