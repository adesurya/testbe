// src/app.js
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const apiRoutes = require('./routes/api');
const WhatsappService = require('./services/whatsappService');
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
    server.close(async () => {
        console.log('Server stopped accepting new connections');
        try {
            await WhatsappService.gracefulShutdown();
            console.log('Cleanup completed');
            process.exit(0);
        } catch (error) {
            console.error('Error during cleanup:', error);
            process.exit(1);
        }
    });

    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
}

module.exports = app;
