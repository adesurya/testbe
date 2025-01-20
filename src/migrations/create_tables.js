// src/migrations/create_tables.js
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function createTables() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'whatsapp_api'
        });

        console.log('Connected to database successfully');

        // Create WhatsApp Sessions table
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

        // Create Messages table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id VARCHAR(255) NOT NULL,
                whatsapp_session_id INT NOT NULL,
                target_number VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                image_path VARCHAR(255),
                delay INT DEFAULT 0,
                status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (whatsapp_session_id) REFERENCES whatsapp_sessions(id)
            )
        `);
        console.log('Messages table created successfully');

    } catch (error) {
        console.error('Error creating tables:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

// Run migrations
createTables()
    .then(() => {
        console.log('Database migrations completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });