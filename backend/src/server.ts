import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { initializeWebSocket } from './utils/websocket';
import { fleetRoutes } from './routes/fleet.routes';
import { missionRoutes } from './routes/mission.routes';
import { surveyRoutes } from './routes/survey.routes';
import { redisClient } from './utils/redis';
import { startDroneSimulator, stopDroneSimulator } from './services/drone-simulator.service';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.BACKEND_PORT || '3001');
const HOST = '0.0.0.0';

// Create Fastify instance
const fastify = Fastify({
    logger: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
            process.env.NODE_ENV !== 'production'
                ? {
                    target: 'pino-pretty',
                    options: {
                        translateTime: 'HH:MM:ss Z',
                        ignore: 'pid,hostname',
                    },
                }
                : undefined,
    },
});

// Register CORS
fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
});

// Health check route
fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register API routes
fastify.register(
    async (instance) => {
        await fleetRoutes(instance);
    },
    { prefix: '/api' }
);

fastify.register(
    async (instance) => {
        await missionRoutes(instance);
    },
    { prefix: '/api' }
);

fastify.register(
    async (instance) => {
        await surveyRoutes(instance);
    },
    { prefix: '/api' }
);

// Error handler
fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);
    reply.status(500).send({
        success: false,
        error: error.message || 'Internal Server Error',
    });
});

// Start server
const start = async () => {
    try {
        // Start Fastify first
        await fastify.listen({ port: PORT, host: HOST });

        // Initialize WebSocket with Fastify's server
        initializeWebSocket(fastify.server);

        // Start continuous drone simulator
        startDroneSimulator();

        console.log('');
        console.log('🚀 ========================================');
        console.log('🚀 Drone Survey Management System Backend');
        console.log('🚀 ========================================');
        console.log(`🚀 Server running at: http://localhost:${PORT}`);
        console.log(`🚀 Health check: http://localhost:${PORT}/health`);
        console.log(`🚀 API base: http://localhost:${PORT}/api`);
        console.log('🚀 ========================================');
        console.log('');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');

    try {
        stopDroneSimulator();
        await fastify.close();
        await redisClient.quit();
        console.log('✅ Server closed successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
start();
