import { PrismaClient, DroneStatus } from '@prisma/client';
import { emitDronePosition } from '../utils/websocket';

const prisma = new PrismaClient();

// Bangalore area bounds
const BANGALORE_BOUNDS = {
    minLat: 12.85,
    maxLat: 13.15,
    minLng: 77.45,
    maxLng: 77.75,
};

// Simulation parameters
const UPDATE_INTERVAL = 2000; // 2 seconds
const MOVEMENT_SPEED = 0.0001; // Degrees per update (roughly 10-15 meters)
const BATTERY_DRAIN_RATE = 0.05; // Battery percentage per update

interface DroneMovement {
    droneId: string;
    direction: number; // Angle in radians
    speed: number;
}

// Store movement state for each drone
const droneMovements = new Map<string, DroneMovement>();

/**
 * Generate random movement direction for a drone
 */
function getRandomDirection(): number {
    return Math.random() * 2 * Math.PI; // Random angle 0 to 2π
}

/**
 * Calculate new position based on current position and movement
 */
function calculateNewPosition(
    currentLat: number,
    currentLng: number,
    direction: number,
    speed: number
): { latitude: number; longitude: number } {
    const newLat = currentLat + Math.sin(direction) * speed;
    const newLng = currentLng + Math.cos(direction) * speed;

    // Keep within Bangalore bounds
    const latitude = Math.max(
        BANGALORE_BOUNDS.minLat,
        Math.min(BANGALORE_BOUNDS.maxLat, newLat)
    );
    const longitude = Math.max(
        BANGALORE_BOUNDS.minLng,
        Math.min(BANGALORE_BOUNDS.maxLng, newLng)
    );

    return { latitude, longitude };
}

/**
 * Update a single drone's position
 */
async function updateDronePosition(droneId: string) {
    try {
        const drone = await prisma.drone.findUnique({
            where: { id: droneId },
        });

        if (!drone || drone.status !== DroneStatus.AVAILABLE) {
            return; // Only simulate AVAILABLE drones
        }

        // Initialize movement if not exists
        if (!droneMovements.has(droneId)) {
            droneMovements.set(droneId, {
                droneId,
                direction: getRandomDirection(),
                speed: MOVEMENT_SPEED,
            });
        }

        const movement = droneMovements.get(droneId)!;

        // Occasionally change direction (20% chance)
        if (Math.random() < 0.2) {
            movement.direction = getRandomDirection();
        }

        // Calculate new position
        const currentLat = drone.latitude || 12.9716;
        const currentLng = drone.longitude || 77.5946;
        const newPosition = calculateNewPosition(
            currentLat,
            currentLng,
            movement.direction,
            movement.speed
        );

        // Update battery (simulate slow drain)
        const newBattery = Math.max(20, drone.battery - BATTERY_DRAIN_RATE);

        // If battery gets too low, recharge it
        const finalBattery = newBattery < 25 ? 100 : newBattery;

        // Update drone in database
        await prisma.drone.update({
            where: { id: droneId },
            data: {
                latitude: newPosition.latitude,
                longitude: newPosition.longitude,
                battery: finalBattery,
            },
        });

        // Broadcast position update via WebSocket
        emitDronePosition(droneId, {
            latitude: newPosition.latitude,
            longitude: newPosition.longitude,
            altitude: drone.altitude || 50,
            battery: finalBattery,
            speed: drone.speed,
        });

        console.log(
            `🚁 Updated drone ${drone.name}: [${newPosition.latitude.toFixed(6)}, ${newPosition.longitude.toFixed(6)}] Battery: ${finalBattery.toFixed(1)}%`
        );
    } catch (error) {
        console.error(`Error updating drone ${droneId}:`, error);
    }
}

/**
 * Main simulation loop
 */
async function simulationLoop() {
    try {
        // Get all AVAILABLE drones
        const drones = await prisma.drone.findMany({
            where: {
                status: DroneStatus.AVAILABLE,
            },
        });

        // Update each drone's position
        await Promise.all(drones.map((drone) => updateDronePosition(drone.id)));
    } catch (error) {
        console.error('Error in drone simulation loop:', error);
    }
}

let simulationInterval: NodeJS.Timeout | null = null;

/**
 * Start the drone simulator
 */
export function startDroneSimulator() {
    if (simulationInterval) {
        console.log('⚠️ Drone simulator already running');
        return;
    }

    console.log('🚁 Starting continuous drone simulator...');
    console.log(`📡 Broadcasting position updates every ${UPDATE_INTERVAL / 1000} seconds`);

    // Run immediately
    simulationLoop();

    // Then run on interval
    simulationInterval = setInterval(simulationLoop, UPDATE_INTERVAL);

    console.log('✅ Drone simulator started successfully');
}

/**
 * Stop the drone simulator
 */
export function stopDroneSimulator() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
        droneMovements.clear();
        console.log('🛑 Drone simulator stopped');
    }
}
