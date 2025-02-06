// src/config/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'WhatsApp Marketing API Documentation',
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
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'User ID'
                        },
                        username: {
                            type: 'string',
                            description: 'Username'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email'
                        },
                        role: {
                            type: 'string',
                            enum: ['user', 'admin'],
                            description: 'User role'
                        }
                    }
                },
                UserProfile: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'User ID'
                        },
                        username: {
                            type: 'string',
                            description: 'Username'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email'
                        },
                        role: {
                            type: 'string',
                            enum: ['user', 'admin'],
                            description: 'User role'
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'inactive'],
                            description: 'Account status'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Account creation date'
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update date'
                        },
                        profile_picture: {
                            type: 'string',
                            nullable: true,
                            description: 'Profile picture URL'
                        },
                        oauth_provider: {
                            type: 'string',
                            enum: ['local', 'google'],
                            description: 'Authentication provider'
                        }
                    }
                },
                WhatsappSession: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'Session ID'
                        },
                        phone_number: {
                            type: 'string',
                            description: 'WhatsApp phone number'
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'inactive'],
                            description: 'Session status'
                        }
                    }
                },
                Message: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Message content'
                        },
                        targetNumber: {
                            type: 'string',
                            description: 'Target phone number'
                        },
                        delay: {
                            type: 'integer',
                            description: 'Delay in seconds'
                        }
                    }
                },
                BulkMessage: {
                    type: 'object',
                    properties: {
                        targetNumbers: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'List of target phone numbers'
                        },
                        message: {
                            type: 'string',
                            description: 'Message content'
                        },
                        baseDelay: {
                            type: 'integer',
                            description: 'Base delay between messages'
                        },
                        intervalDelay: {
                            type: 'integer',
                            description: 'Random additional delay'
                        }
                    }
                },
                ButtonMessage: {
                    type: 'object',
                    properties: {
                        targetNumbers: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'List of target phone numbers'
                        },
                        message: {
                            type: 'string',
                            description: 'Message content'
                        },
                        buttonText: {
                            type: 'string',
                            description: 'Button text'
                        },
                        url: {
                            type: 'string',
                            description: 'URL for button'
                        },
                        footerText: {
                            type: 'string',
                            description: 'Footer text'
                        }
                    }
                },
                Plan: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'Plan ID'
                        },
                        name: {
                            type: 'string',
                            description: 'Plan name'
                        },
                        messageLimit: {
                            type: 'integer',
                            description: 'Message limit'
                        },
                        duration: {
                            type: 'integer',
                            description: 'Duration in days'
                        },
                        price: {
                            type: 'number',
                            description: 'Plan price'
                        }
                    }
                },
                UserStats: {
                    type: 'object',
                    properties: {
                        sessions: {
                            type: 'object',
                            properties: {
                                active: {
                                    type: 'integer',
                                    description: 'Number of active sessions'
                                }
                            }
                        },
                        messages: {
                            type: 'object',
                            properties: {
                                single: {
                                    type: 'object',
                                    properties: {
                                        total: {
                                            type: 'integer'
                                        },
                                        successful: {
                                            type: 'integer'
                                        },
                                        failed: {
                                            type: 'integer'
                                        },
                                        success_rate: {
                                            type: 'string'
                                        }
                                    }
                                },
                                bulk: {
                                    type: 'object',
                                    properties: {
                                        campaigns: {
                                            type: 'integer'
                                        },
                                        total_messages: {
                                            type: 'integer'
                                        },
                                        successful: {
                                            type: 'integer'
                                        },
                                        failed: {
                                            type: 'integer'
                                        },
                                        success_rate: {
                                            type: 'string'
                                        }
                                    }
                                },
                                overall: {
                                    type: 'object',
                                    properties: {
                                        total: {
                                            type: 'integer'
                                        },
                                        successful: {
                                            type: 'integer'
                                        },
                                        failed: {
                                            type: 'integer'
                                        },
                                        success_rate: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    apis: [path.join(__dirname, '../routes/*.js')]
};

const swaggerSpec = swaggerJSDoc(options);

const getSwaggerJson = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
};

module.exports = swaggerSpec;