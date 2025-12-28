import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

/**
 * Initialize Socket.IO server
 */
export function initializeWebSocket(server: HTTPServer): SocketIOServer {
    io = new SocketIOServer(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket) => {
        console.log(`✅ Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });

        // Handle client subscribing to specific mission updates
        socket.on('subscribe:mission', (missionId: string) => {
            socket.join(`mission:${missionId}`);
            console.log(`📡 Client ${socket.id} subscribed to mission ${missionId}`);
        });

        socket.on('unsubscribe:mission', (missionId: string) => {
            socket.leave(`mission:${missionId}`);
            console.log(`📡 Client ${socket.id} unsubscribed from mission ${missionId}`);
        });

        // Handle client subscribing to drone updates
        socket.on('subscribe:drone', (droneId: string) => {
            socket.join(`drone:${droneId}`);
            console.log(`📡 Client ${socket.id} subscribed to drone ${droneId}`);
        });

        socket.on('unsubscribe:drone', (droneId: string) => {
            socket.leave(`drone:${droneId}`);
            console.log(`📡 Client ${socket.id} unsubscribed from drone ${droneId}`);
        });
    });

    console.log('✅ WebSocket server initialized');
    return io;
}

/**
 * Get Socket.IO server instance
 */
export function getIO(): SocketIOServer {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeWebSocket first.');
    }
    return io;
}

// Event emitters for real-time updates

/**
 * Emit drone position update
 */
export function emitDronePosition(droneId: string, position: {
    latitude: number;
    longitude: number;
    altitude: number;
    battery: number;
    speed: number;
}) {
    if (io) {
        // Broadcast to all clients AND to subscribed clients
        io.emit('drone:position', {
            droneId,
            ...position,
            timestamp: new Date().toISOString(),
        });
        console.log(`📡 Broadcasting drone position for ${droneId}:`, position);
    }
}

/**
 * Emit mission progress update
 */
export function emitMissionProgress(missionId: string, data: {
    progress: number;
    currentWaypoint: number;
    totalWaypoints: number;
    distanceCovered: number;
    estimatedTimeRemaining: number;
}) {
    if (io) {
        io.to(`mission:${missionId}`).emit('mission:progress', {
            missionId,
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Emit mission status change
 */
export function emitMissionStatus(missionId: string, status: string, data?: any) {
    if (io) {
        io.emit('mission:status', {
            missionId,
            status,
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Emit drone status change
 */
export function emitDroneStatus(droneId: string, status: string, data?: any) {
    if (io) {
        io.emit('drone:status', {
            droneId,
            status,
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Emit fleet statistics update
 */
export function emitFleetStats(stats: {
    total: number;
    available: number;
    inMission: number;
    charging: number;
    maintenance: number;
    offline: number;
}) {
    if (io) {
        io.emit('fleet:stats', {
            ...stats,
            timestamp: new Date().toISOString(),
        });
    }
}
