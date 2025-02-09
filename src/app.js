// src/app.js
const express = require('express');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const apiRoutes = require('./routes/api');
const WhatsappService = require('./services/whatsappService');
const CleanupService = require('./services/cleanupService');
const { swaggerSpec, getSwaggerJson } = require('./config/swagger');
const path = require('path');
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads');


if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}
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
app.use('/uploads', express.static(uploadDir));

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'WhatsApp Marketing API',
            version: '1.0.0',
            description: 'API Documentation'
        },
        servers: [
            {
                url: 'http://localhost:8000',
                description: 'Development server'
            }
        ]
    },
    apis: [path.join(__dirname, './routes/*.js')]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

app.use('/api-docs', swaggerUI.serve);
app.get('/api-docs', swaggerUI.setup(swaggerDocs));
app.get('/api-docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocs);
});

// Error handling
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
    next(err);
});

const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 8000}`);
    console.log(`Swagger documentation available at http://localhost:${process.env.PORT || 8000}/api-docs`);
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
