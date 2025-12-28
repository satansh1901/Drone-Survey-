import { PrismaClient, Drone, DroneStatus } from '@prisma/client';
import { cacheHelper, cacheKeys } from '../utils/redis';
import { emitDroneStatus, emitFleetStats } from '../utils/websocket';

const prisma = new PrismaClient();

export class FleetService {
    /**
     * Get all drones with optional status filter
     */
    async getAllDrones(status?: DroneStatus): Promise<Drone[]> {
        const cacheKey = status ? `${cacheKeys.allDrones()}:${status}` : cacheKeys.allDrones();

        // Try cache first
        const cached = await cacheHelper.get<Drone[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const drones = await prisma.drone.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: 'desc' },
        });

        // Cache for 60 seconds
        await cacheHelper.set(cacheKey, drones, 60);
        return drones;
    }

    /**
     * Get drone by ID
     */
    async getDroneById(id: string): Promise<Drone | null> {
        const cacheKey = cacheKeys.drone(id);

        // Try cache first
        const cached = await cacheHelper.get<Drone>(cacheKey);
        if (cached) {
            return cached;
        }

        const drone = await prisma.drone.findUnique({
            where: { id },
            include: {
                missions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });

        if (drone) {
            await cacheHelper.set(cacheKey, drone, 300);
        }

        return drone;
    }

    /**
     * Create new drone
     */
    async createDrone(data: {
        name: string;
        model: string;
        speed?: number;
        maxSpeed?: number;
        maxAltitude?: number;
    }): Promise<Drone> {
        const drone = await prisma.drone.create({
            data: {
                name: data.name,
                model: data.model,
                speed: data.speed || 10.0,
                maxSpeed: data.maxSpeed || 15.0,
                maxAltitude: data.maxAltitude || 120.0,
                status: DroneStatus.AVAILABLE,
                battery: 100.0,
            },
        });

        // Invalidate cache
        await cacheHelper.delPattern('drones:*');

        // Emit status update
        emitDroneStatus(drone.id, drone.status);
        await this.emitFleetStatistics();

        return drone;
    }

    /**
     * Update drone
     */
    async updateDrone(
        id: string,
        data: Partial<{
            name: string;
            model: string;
            status: DroneStatus;
            battery: number;
            latitude: number;
            longitude: number;
            altitude: number;
            speed: number;
            maxSpeed: number;
            maxAltitude: number;
        }>
    ): Promise<Drone> {
        const drone = await prisma.drone.update({
            where: { id },
            data,
        });

        // Invalidate cache
        await cacheHelper.del(cacheKeys.drone(id));
        await cacheHelper.delPattern('drones:*');

        // Emit status update if status changed
        if (data.status) {
            emitDroneStatus(drone.id, drone.status);
            await this.emitFleetStatistics();
        }

        return drone;
    }

    /**
     * Delete drone
     */
    async deleteDrone(id: string): Promise<void> {
        // Check if drone is in an active mission
        const drone = await prisma.drone.findUnique({
            where: { id },
            include: {
                missions: {
                    where: {
                        status: {
                            in: ['ACTIVE', 'PAUSED'],
                        },
                    },
                },
            },
        });

        if (drone?.missions && drone.missions.length > 0) {
            throw new Error('Cannot delete drone with active missions');
        }

        await prisma.drone.delete({
            where: { id },
        });

        // Invalidate cache
        await cacheHelper.del(cacheKeys.drone(id));
        await cacheHelper.delPattern('drones:*');

        await this.emitFleetStatistics();
    }

    /**
     * Get fleet statistics
     */
    async getFleetStatistics() {
        const [total, available, inMission, charging, maintenance, offline] = await Promise.all([
            prisma.drone.count(),
            prisma.drone.count({ where: { status: DroneStatus.AVAILABLE } }),
            prisma.drone.count({ where: { status: DroneStatus.IN_MISSION } }),
            prisma.drone.count({ where: { status: DroneStatus.CHARGING } }),
            prisma.drone.count({ where: { status: DroneStatus.MAINTENANCE } }),
            prisma.drone.count({ where: { status: DroneStatus.OFFLINE } }),
        ]);

        return {
            total,
            available,
            inMission,
            charging,
            maintenance,
            offline,
        };
    }

    /**
     * Emit fleet statistics via WebSocket
     */
    async emitFleetStatistics() {
        const stats = await this.getFleetStatistics();
        emitFleetStats(stats);
    }

    /**
     * Update drone position
     */
    async updateDronePosition(
        id: string,
        position: {
            latitude: number;
            longitude: number;
            altitude: number;
        }
    ): Promise<void> {
        await prisma.drone.update({
            where: { id },
            data: position,
        });

        // Invalidate cache
        await cacheHelper.del(cacheKeys.drone(id));
    }

    /**
     * Update drone battery
     */
    async updateDroneBattery(id: string, battery: number): Promise<void> {
        await prisma.drone.update({
            where: { id },
            data: { battery },
        });

        // Invalidate cache
        await cacheHelper.del(cacheKeys.drone(id));

        // If battery is low, update status
        if (battery < 20) {
            await this.updateDrone(id, { status: DroneStatus.CHARGING });
        }
    }
}

export const fleetService = new FleetService();
