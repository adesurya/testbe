// src/migrations/create_bulk_messages.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createBulkMessagesTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Create message_bulks table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS message_bulks (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                image_path VARCHAR(255),
                total_messages INT NOT NULL,
                total_sent INT DEFAULT 0,
                total_failed INT DEFAULT 0,
                status ENUM('processing', 'completed', 'partially_completed', 'failed') DEFAULT 'processing',
                failed_numbers JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('message_bulks table created successfully');

        // Create bulk_messages table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS bulk_messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                bulk_id INT NOT NULL,
                user_id INT NOT NULL,
                whatsapp_session_id INT,
                target_number VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                image_path VARCHAR(255),
                status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (bulk_id) REFERENCES message_bulks(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (whatsapp_session_id) REFERENCES whatsapp_sessions(id)
            )
        `);
        console.log('bulk_messages table created successfully');

    } catch (error) {
        console.error('Error creating bulk messages tables:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

createBulkMessagesTables();