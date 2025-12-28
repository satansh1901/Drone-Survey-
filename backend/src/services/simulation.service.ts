import Queue from 'bull';
import { PrismaClient, MissionStatus } from '@prisma/client';
import { missionService } from './mission.service';
import { fleetService } from './fleet.service';
import { emitDronePosition, emitMissionProgress } from '../utils/websocket';
import { calculateDistance, interpolatePosition } from '../utils/geospatial';

const prisma = new PrismaClient();

// Create Bull queue for mission simulation
export const missionQueue = new Queue('mission-simulation', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
    },
});

interface MissionJob {
    missionId: string;
}

/**
 * Mission simulation worker
 * Simulates drone movement along waypoints and updates position in real-time
 */
missionQueue.process(async (job) => {
    const { missionId } = job.data as MissionJob;

    console.log(`🚁 Starting mission simulation: ${missionId}`);

    try {
        const mission = await missionService.getMissionById(missionId);

        if (!mission) {
            throw new Error('Mission not found');
        }

        const waypoints = await prisma.waypoint.findMany({
            where: { missionId },
            orderBy: { sequence: 'asc' },
        });

        if (waypoints.length === 0) {
            throw new Error('No waypoints found');
        }

        const drone = await prisma.drone.findUnique({
            where: { id: mission.droneId },
        });

        if (!drone) {
            throw new Error('Drone not found');
        }

        let currentWaypointIndex = mission.currentWaypoint;
        let totalDistanceCovered = mission.distanceCovered;
        const speed = mission.speed; // meters per second
        const updateInterval = 1000; // Update every 1 second
        const batteryDrainRate = 0.1; // Battery percentage per second

        // Simulation loop
        while (currentWaypointIndex < waypoints.length - 1) {
            // Check if mission is still active
            const currentMission = await prisma.mission.findUnique({
                where: { id: missionId },
            });

            if (!currentMission || currentMission.status !== MissionStatus.ACTIVE) {
                console.log(`⏸️ Mission ${missionId} paused or stopped`);
                break;
            }

            const currentWaypoint = waypoints[currentWaypointIndex];
            const nextWaypoint = waypoints[currentWaypointIndex + 1];

            const from: [number, number, number] = [
                currentWaypoint.longitude,
                currentWaypoint.latitude,
                currentWaypoint.altitude,
            ];
            const to: [number, number, number] = [
                nextWaypoint.longitude,
                nextWaypoint.latitude,
                nextWaypoint.altitude,
            ];

            // Calculate distance between waypoints
            const segmentDistance = calculateDistance(
                [from[0], from[1]],
                [to[0], to[1]]
            );

            // Calculate time to travel this segment
            const segmentTime = segmentDistance / speed; // seconds
            const steps = Math.ceil(segmentTime / (updateInterval / 1000));

            // Interpolate position along the segment
            for (let step = 0; step <= steps; step++) {
                // Check mission status again
                const statusCheck = await prisma.mission.findUnique({
                    where: { id: missionId },
                    select: { status: true },
                });

                if (statusCheck?.status !== MissionStatus.ACTIVE) {
                    console.log(`⏸️ Mission ${missionId} paused during segment`);
                    return;
                }

                const progress = step / steps;
                const position = interpolatePosition(from, to, progress);

                // Update drone position
                await fleetService.updateDronePosition(mission.droneId, {
                    longitude: position[0],
                    latitude: position[1],
                    altitude: position[2],
                });

                // Update battery
                const currentDrone = await prisma.drone.findUnique({
                    where: { id: mission.droneId },
                });

                if (currentDrone) {
                    const newBattery = Math.max(0, currentDrone.battery - batteryDrainRate);
                    await fleetService.updateDroneBattery(mission.droneId, newBattery);

                    // Emit drone position update
                    emitDronePosition(mission.droneId, {
                        latitude: position[1],
                        longitude: position[0],
                        altitude: position[2],
                        battery: newBattery,
                        speed,
                    });

                    // Check if battery is too low
                    if (newBattery < 10) {
                        console.log(`🪫 Low battery for drone ${mission.droneId}, aborting mission`);
                        await missionService.abortMission(missionId);
                        return;
                    }
                }

                // Calculate overall progress
                const distanceToNext = calculateDistance(
                    [position[0], position[1]],
                    [to[0], to[1]]
                );
                const segmentProgress = 1 - distanceToNext / segmentDistance;
                const waypointsCompleted = currentWaypointIndex + segmentProgress;
                const overallProgress = (waypointsCompleted / waypoints.length) * 100;

                // Update mission progress
                await missionService.updateMissionProgress(missionId, {
                    progress: overallProgress,
                    currentWaypoint: currentWaypointIndex,
                    distanceCovered: totalDistanceCovered + (segmentDistance * segmentProgress),
                });

                // Calculate ETA
                const remainingWaypoints = waypoints.length - waypointsCompleted;
                const estimatedTimeRemaining = (remainingWaypoints / waypoints.length) * (mission.estimatedTime || 0);

                // Emit mission progress update
                emitMissionProgress(missionId, {
                    progress: overallProgress,
                    currentWaypoint: currentWaypointIndex,
                    totalWaypoints: waypoints.length,
                    distanceCovered: totalDistanceCovered + (segmentDistance * segmentProgress),
                    estimatedTimeRemaining,
                });

                // Wait for next update
                await new Promise((resolve) => setTimeout(resolve, updateInterval));
            }

            // Mark waypoint as reached
            await prisma.waypoint.update({
                where: { id: nextWaypoint.id },
                data: {
                    reached: true,
                    reachedAt: new Date(),
                },
            });

            totalDistanceCovered += segmentDistance;
            currentWaypointIndex++;
        }

        // Mission completed
        console.log(`✅ Mission ${missionId} completed`);
        await missionService.completeMission(missionId);
    } catch (error) {
        console.error(`❌ Mission simulation error for ${missionId}:`, error);
        await missionService.abortMission(missionId);
        throw error;
    }
});

/**
 * Start mission simulation
 */
export async function startMissionSimulation(missionId: string): Promise<void> {
    await missionQueue.add(
        { missionId },
        {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        }
    );

    console.log(`📡 Mission simulation queued: ${missionId}`);
}

/**
 * Stop mission simulation
 */
export async function stopMissionSimulation(missionId: string): Promise<void> {
    // The simulation will stop automatically when mission status changes
    console.log(`🛑 Stopping mission simulation: ${missionId}`);
}

// Queue event listeners
missionQueue.on('completed', (job) => {
    console.log(`✅ Mission simulation completed: ${job.data.missionId}`);
});

missionQueue.on('failed', (job, err) => {
    console.error(`❌ Mission simulation failed: ${job?.data?.missionId}`, err);
});

missionQueue.on('error', (error) => {
    console.error('❌ Queue error:', error);
});
