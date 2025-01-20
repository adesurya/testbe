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
app.use(express.json());

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
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
    console.log('Received shutdown signal');

    // Berhenti menerima request baru
    server.close(async () => {
        console.log('Server stopped accepting new connections');
        
        try {
            // Cleanup WhatsApp service
            await WhatsappService.gracefulShutdown();
            console.log('Cleanup completed');
            process.exit(0);
        } catch (error) {
            console.error('Error during cleanup:', error);
            process.exit(1);
        }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
}

module.exports = app;
