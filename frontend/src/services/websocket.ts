import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

class WebSocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    connect() {
        if (this.socket?.connected) {
            return;
        }

        this.socket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ WebSocket disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
        });

        // Set up event listeners
        this.setupEventListeners();
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    private setupEventListeners() {
        if (!this.socket) return;

        // Drone position updates
        this.socket.on('drone:position', (data) => {
            this.emit('drone:position', data);
        });

        // Drone status updates
        this.socket.on('drone:status', (data) => {
            this.emit('drone:status', data);
        });

        // Mission progress updates
        this.socket.on('mission:progress', (data) => {
            this.emit('mission:progress', data);
        });

        // Mission status updates
        this.socket.on('mission:status', (data) => {
            this.emit('mission:status', data);
        });

        // Fleet statistics updates
        this.socket.on('fleet:stats', (data) => {
            this.emit('fleet:stats', data);
        });
    }

    // Subscribe to mission updates
    subscribeMission(missionId: string) {
        if (this.socket) {
            this.socket.emit('subscribe:mission', missionId);
        }
    }

    unsubscribeMission(missionId: string) {
        if (this.socket) {
            this.socket.emit('unsubscribe:mission', missionId);
        }
    }

    // Subscribe to drone updates
    subscribeDrone(droneId: string) {
        if (this.socket) {
            this.socket.emit('subscribe:drone', droneId);
        }
    }

    unsubscribeDrone(droneId: string) {
        if (this.socket) {
            this.socket.emit('unsubscribe:drone', droneId);
        }
    }

    // Event listener management
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: Function) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
        }
    }

    private emit(event: string, data: any) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach((callback) => callback(data));
        }
    }
}

export const wsService = new WebSocketService();
export default wsService;
