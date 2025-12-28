import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client for caching and pub/sub
export const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

redisClient.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
});

// Cache helper functions
export const cacheHelper = {
    // Set cache with expiration (in seconds)
    async set(key: string, value: any, ttl: number = 300): Promise<void> {
        await redisClient.setex(key, ttl, JSON.stringify(value));
    },

    // Get cache
    async get<T>(key: string): Promise<T | null> {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    },

    // Delete cache
    async del(key: string): Promise<void> {
        await redisClient.del(key);
    },

    // Delete multiple keys by pattern
    async delPattern(pattern: string): Promise<void> {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(...keys);
        }
    },

    // Check if key exists
    async exists(key: string): Promise<boolean> {
        const result = await redisClient.exists(key);
        return result === 1;
    },
};

// Cache key generators
export const cacheKeys = {
    drone: (id: string) => `drone:${id}`,
    allDrones: () => 'drones:all',
    mission: (id: string) => `mission:${id}`,
    activeMissions: () => 'missions:active',
    dronePosition: (droneId: string) => `position:${droneId}`,
};
