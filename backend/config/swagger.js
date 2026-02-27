const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'AskDB API',
        version: '1.0.0',
        description: 'AI Copilot for MongoDB',
    },
    servers: [
        {
            url: 'http://localhost:5000',
            description: 'Development Server',
        },
    ],
};

const options = {
    swaggerDefinition,
    apis: ['./routes/*.js'], // Points to route files for JSDoc annotations
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
