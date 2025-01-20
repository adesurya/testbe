// src/config/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'WhatsApp Marketing API',
            version: '1.0.0',
            description: 'API Documentation for WhatsApp Marketing Application'
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: [path.join(__dirname, '../routes/*.js')] // absolute path to route files
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;