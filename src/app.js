// src/app.js
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const apiRoutes = require('./routes/api');
const WhatsappService = require('./services/whatsappService');
const CleanupService = require('./services/cleanupService');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({
    verify: (req, res, buf, encoding) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            res.status(400).json({ 
                success: false,
                error: 'Invalid JSON payload',
                details: e.message 
            });
            throw new Error('Invalid JSON');
        }
    }
}));

// API Routes
app.use('/api', apiRoutes);

// Swagger documentation
const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
        persistAuthorization: true
    },
    customCss: '.swagger-ui .topbar { display: none }'
};

app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerOptions));

// Error handling
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
    console.log(`Swagger documentation available at http://localhost:${process.env.PORT || 3000}/api-docs`);
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
    console.log('Received shutdown signal');
    
    try {
        // Cleanup auth and cache directories
        await CleanupService.cleanup();
        
        // Disconnect WhatsApp sessions
        if (WhatsappService.gracefulShutdown) {
            await WhatsappService.gracefulShutdown();
        }
        
        console.log('Cleanup completed, shutting down...');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await CleanupService.cleanup();
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await CleanupService.cleanup();
    process.exit(1);
});

module.exports = app;
