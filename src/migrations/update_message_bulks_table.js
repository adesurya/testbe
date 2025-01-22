// src/migrations/update_message_bulks_table.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateMessageBulksTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Add message_type column
        await connection.query(`
            ALTER TABLE message_bulks 
            ADD COLUMN message_type ENUM('regular', 'button') DEFAULT 'regular' AFTER message,
            ADD COLUMN button_data JSON DEFAULT NULL AFTER message_type
        `);

        console.log('message_bulks table updated successfully');

    } catch (error) {
        console.error('Error updating message_bulks table:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run migration
updateMessageBulksTable()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });