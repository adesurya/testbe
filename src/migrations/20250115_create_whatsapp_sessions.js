// src/migrations/20250115_create_whatsapp_sessions.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createWhatsappSessionsTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_sessions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id VARCHAR(255) NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'inactive',
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_phone (phone_number)
            )
        `);
        console.log('WhatsApp sessions table created successfully');
    } catch (error) {
        console.error('Error creating WhatsApp sessions table:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

createWhatsappSessionsTable();