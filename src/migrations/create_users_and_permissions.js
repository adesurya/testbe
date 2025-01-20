// src/migrations/create_users_and_permissions.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createUsersAndPermissions() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                role ENUM('admin', 'user') DEFAULT 'user',
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Users table created successfully');

        // Create metrics table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS metrics (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                whatsapp_session_id INT,
                message_count INT DEFAULT 0,
                success_count INT DEFAULT 0,
                failed_count INT DEFAULT 0,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (whatsapp_session_id) REFERENCES whatsapp_sessions(id)
            )
        `);
        console.log('Metrics table created successfully');

        // Insert default admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await connection.query(`
            INSERT INTO users (username, password, email, role) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE username=username`,
            ['admin', hashedPassword, 'admin@example.com', 'admin']
        );
        console.log('Default admin user created');

    } catch (error) {
        console.error('Error creating tables:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run migrations
createUsersAndPermissions()
    .then(() => {
        console.log('Database migrations completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });