// src/migrations/create_messages.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createMessagesTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                whatsapp_session_id INT NOT NULL,
                target_number VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                image_path VARCHAR(255),
                delay INT DEFAULT 0,
                status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (whatsapp_session_id) REFERENCES whatsapp_sessions(id)
            )
        `);
        console.log('Messages table created or updated successfully');
    } catch (error) {
        console.error('Error creating messages table:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

createMessagesTable();