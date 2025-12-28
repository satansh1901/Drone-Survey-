import { PrismaClient, Mission, MissionStatus, PathPattern, DroneStatus } from '@prisma/client';
import { cacheHelper, cacheKeys } from '../utils/redis';
import { emitMissionStatus } from '../utils/websocket';
import {
    generateGridPattern,
    generatePerimeterPattern,
    generateCrosshatchPattern,
    calculateArea,
    calculateMissionTime,
} from '../utils/geospatial';
import { fleetService } from './fleet.service';

const prisma = new PrismaClient();

interface MissionCreateInput {
    name: string;
    droneId: string;
    surveyArea: number[][]; // Array of [longitude, latitude] coordinates
    pathPattern: PathPattern;
    altitude: number;
    speed?: number;
    overlapPercent?: number;
}

export class MissionService {
    /**
     * Create a new mission with flight path generation
     */
    async createMission(input: MissionCreateInput): Promise<Mission> {
        // Validate drone availability
        const drone = await prisma.drone.findUnique({
            where: { id: input.droneId },
        });

        if (!drone) {
            throw new Error('Drone not found');
        }

        if (drone.status !== DroneStatus.AVAILABLE) {
            throw new Error('Drone is not available');
        }

        // Generate flight path based on pattern
        const waypoints = this.generateFlightPath(
            input.surveyArea,
            input.pathPattern,
            input.altitude,
            input.overlapPercent || 70
        );

        if (waypoints.length === 0) {
            throw new Error('Failed to generate flight path');
        }

        // Calculate mission statistics
        calculateArea(input.surveyArea); // Calculate but don't store
        const estimatedTime = calculateMissionTime(waypoints, input.speed || drone.speed);

        // Create mission
        const mission = await prisma.mission.create({
            data: {
                name: input.name,
                droneId: input.droneId,
                surveyArea: input.surveyArea,
                pathPattern: input.pathPattern,
                altitude: input.altitude,
                speed: input.speed || drone.speed,
                overlapPercent: input.overlapPercent || 70,
                status: MissionStatus.PLANNED,
                totalWaypoints: waypoints.length,
                estimatedTime,
                areaCovered: 0,
                distanceCovered: 0,
                progress: 0,
                currentWaypoint: 0,
            },
        });

        // Create waypoints
        await prisma.waypoint.createMany({
            data: waypoints.map((wp, index) => ({
                missionId: mission.id,
                sequence: index,
                longitude: wp[0],
                latitude: wp[1],
                altitude: wp[2],
                reached: false,
            })),
        });

        // Invalidate cache
        await cacheHelper.delPattern('missions:*');

        emitMissionStatus(mission.id, mission.status, { mission });

        return mission;
    }

    /**
     * Generate flight path based on pattern type
     */
    private generateFlightPath(
        polygon: number[][],
        pattern: PathPattern,
        altitude: number,
        overlapPercent: number
    ): Array<[number, number, number]> {
        // Calculate spacing based on overlap percentage
        // Assuming camera FOV and altitude, calculate line spacing
        // For simplicity, using a fixed spacing calculation
        const spacing = altitude * 0.5 * (1 - overlapPercent / 100);

        switch (pattern) {
            case PathPattern.GRID:
                return generateGridPattern(polygon, altitude, spacing);
            case PathPattern.PERIMETER:
                return generatePerimeterPattern(polygon, altitude);
            case PathPattern.CROSSHATCH:
                return generateCrosshatchPattern(polygon, altitude, spacing);
            default:
                return generateGridPattern(polygon, altitude, spacing);
        }
    }

    /**
     * Get all missions with optional filters
     */
    async getAllMissions(filters?: {
        status?: MissionStatus;
        droneId?: string;
    }): Promise<Mission[]> {
        const missions = await prisma.mission.findMany({
            where: {
                ...(filters?.status && { status: filters.status }),
                ...(filters?.droneId && { droneId: filters.droneId }),
            },
            include: {
                drone: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return missions;
    }

    /**
     * Get mission by ID
     */
    async getMissionById(id: string): Promise<Mission | null> {
        const cacheKey = cacheKeys.mission(id);

        // Try cache first
        const cached = await cacheHelper.get<Mission>(cacheKey);
        if (cached) {
            return cached;
        }

        const mission = await prisma.mission.findUnique({
            where: { id },
            include: {
                drone: true,
                waypoints: {
                    orderBy: { sequence: 'asc' },
                },
            },
        });

        if (mission) {
            await cacheHelper.set(cacheKey, mission, 60);
        }

        return mission;
    }

    /**
     * Start a mission
     */
    async startMission(id: string): Promise<Mission> {
        const mission = await this.getMissionById(id);

        if (!mission) {
            throw new Error('Mission not found');
        }

        if (mission.status !== MissionStatus.PLANNED && mission.status !== MissionStatus.PAUSED) {
            throw new Error('Mission cannot be started');
        }

        // Update drone status
        await fleetService.updateDrone(mission.droneId, {
            status: DroneStatus.IN_MISSION,
        });

        // Update mission status
        const updatedMission = await prisma.mission.update({
            where: { id },
            data: {
                status: MissionStatus.ACTIVE,
                startTime: mission.startTime || new Date(),
            },
        });

        // Invalidate cache
        await cacheHelper.del(cacheKeys.mission(id));
        await cacheHelper.delPattern('missions:*');

        emitMissionStatus(id, MissionStatus.ACTIVE, { mission: updatedMission });

        return updatedMission;
    }

    /**
     * Pause a mission
     */
    async pauseMission(id: string): Promise<Mission> {
        const mission = await this.getMissionById(id);

        if (!mission) {
            throw new Error('Mission not found');
        }

        if (mission.status !== MissionStatus.ACTIVE) {
            throw new Error('Only active missions can be paused');
        }

        const updatedMission = await prisma.mission.update({
            where: { id },
            data: {
                status: MissionStatus.PAUSED,
            },
        });

        // Invalidate cache
        await cacheHelper.del(cacheKeys.mission(id));

        emitMissionStatus(id, MissionStatus.PAUSED, { mission: updatedMission });

        return updatedMission;
    }

    /**
     * Resume a paused mission
     */
    async resumeMission(id: string): Promise<Mission> {
        const mission = await this.getMissionById(id);

        if (!mission) {
            throw new Error('Mission not found');
        }

        if (mission.status !== MissionStatus.PAUSED) {
            throw new Error('Only paused missions can be resumed');
        }

        const updatedMission = await prisma.mission.update({
            where: { id },
            data: {
                status: MissionStatus.ACTIVE,
            },
        });

        // Invalidate cache
        await cacheHelper.del(cacheKeys.mission(id));

        emitMissionStatus(id, MissionStatus.ACTIVE, { mission: updatedMission });

        return updatedMission;
    }

    /**
     * Abort a mission
     */
    async abortMission(id: string): Promise<Mission> {
        const mission = await this.getMissionById(id);

        if (!mission) {
            throw new Error('Mission not found');
        }

        if (mission.status === MissionStatus.COMPLETED || mission.status === MissionStatus.ABORTED) {
            throw new Error('Mission already finished');
        }

        // Update drone status back to available
        await fleetService.updateDrone(mission.droneId, {
            status: DroneStatus.AVAILABLE,
        });

        const updatedMission = await prisma.mission.update({
            where: { id },
            data: {
                status: MissionStatus.ABORTED,
                endTime: new Date(),
            },
        });

        // Invalidate cache
        await cacheHelper.del(cacheKeys.mission(id));
        await cacheHelper.delPattern('missions:*');

        emitMissionStatus(id, MissionStatus.ABORTED, { mission: updatedMission });

        return updatedMission;
    }

    /**
     * Update mission progress
     */
    async updateMissionProgress(
        id: string,
        data: {
            progress: number;
            currentWaypoint: number;
            distanceCovered: number;
        }
    ): Promise<void> {
        await prisma.mission.update({
            where: { id },
            data,
        });

        // Invalidate cache
        await cacheHelper.del(cacheKeys.mission(id));
    }

    /**
     * Complete a mission
     */
    async completeMission(id: string): Promise<Mission> {
        const mission = await this.getMissionById(id);

        if (!mission) {
            throw new Error('Mission not found');
        }

        // Calculate actual time
        const actualTime = mission.startTime
            ? (new Date().getTime() - new Date(mission.startTime).getTime()) / 1000
            : 0;

        // Update drone status back to available
        await fleetService.updateDrone(mission.droneId, {
            status: DroneStatus.AVAILABLE,
        });

        const updatedMission = await prisma.mission.update({
            where: { id },
            data: {
                status: MissionStatus.COMPLETED,
                endTime: new Date(),
                actualTime,
                progress: 100,
            },
        });

        // Invalidate cache
        await cacheHelper.del(cacheKeys.mission(id));
        await cacheHelper.delPattern('missions:*');

        emitMissionStatus(id, MissionStatus.COMPLETED, { mission: updatedMission });

        return updatedMission;
    }

    /**
     * Get active missions
     */
    async getActiveMissions(): Promise<Mission[]> {
        return await prisma.mission.findMany({
            where: {
                status: {
                    in: [MissionStatus.ACTIVE, MissionStatus.PAUSED],
                },
            },
            include: {
                drone: true,
                waypoints: {
                    orderBy: { sequence: 'asc' },
                },
            },
        });
    }
}

export const missionService = new MissionService();
