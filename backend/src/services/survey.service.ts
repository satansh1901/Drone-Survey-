import { PrismaClient, Mission, SurveyReport } from '@prisma/client';

const prisma = new PrismaClient();

export class SurveyService {
    /**
     * Generate survey report for a completed mission
     */
    async generateSurveyReport(missionId: string): Promise<SurveyReport> {
        const mission = await prisma.mission.findUnique({
            where: { id: missionId },
            include: {
                drone: true,
                waypoints: true,
            },
        });

        if (!mission) {
            throw new Error('Mission not found');
        }

        // Check if report already exists
        const existingReport = await prisma.surveyReport.findUnique({
            where: { missionId },
        });

        if (existingReport) {
            return existingReport;
        }

        // Calculate metrics
        const waypointsTotal = mission.waypoints.length;
        const waypointsReached = mission.waypoints.filter((wp) => wp.reached).length;

        // Calculate average and max speed
        const avgSpeed = mission.speed;
        const maxSpeed = mission.drone.maxSpeed;

        // Calculate average altitude
        const avgAltitude = mission.altitude;

        // Calculate battery used
        const initialBattery = 100;
        const finalBattery = mission.drone.battery;
        const batteryUsed = initialBattery - finalBattery;

        // Create survey report
        const report = await prisma.surveyReport.create({
            data: {
                missionId,
                duration: mission.actualTime || 0,
                distance: mission.distanceCovered,
                coverage: mission.areaCovered,
                waypointsTotal,
                waypointsReached,
                avgSpeed,
                maxSpeed,
                avgAltitude,
                batteryUsed,
                metadata: {
                    pathPattern: mission.pathPattern,
                    overlapPercent: mission.overlapPercent,
                    completionRate: (waypointsReached / waypointsTotal) * 100,
                },
            },
        });

        return report;
    }

    /**
     * Get survey report by mission ID
     */
    async getSurveyReport(missionId: string): Promise<SurveyReport | null> {
        return await prisma.surveyReport.findUnique({
            where: { missionId },
            include: {
                mission: {
                    include: {
                        drone: true,
                    },
                },
            },
        });
    }

    /**
     * Get all survey reports
     */
    async getAllSurveyReports(): Promise<SurveyReport[]> {
        return await prisma.surveyReport.findMany({
            include: {
                mission: {
                    include: {
                        drone: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get organization-wide statistics
     */
    async getOrganizationStats() {
        const [
            totalMissions,
            completedMissions,
            totalDistance,
            totalCoverage,
            totalDuration,
            reports,
        ] = await Promise.all([
            prisma.mission.count(),
            prisma.mission.count({ where: { status: 'COMPLETED' } }),
            prisma.surveyReport.aggregate({
                _sum: { distance: true },
            }),
            prisma.surveyReport.aggregate({
                _sum: { coverage: true },
            }),
            prisma.surveyReport.aggregate({
                _sum: { duration: true },
            }),
            prisma.surveyReport.findMany({
                include: {
                    mission: {
                        include: {
                            drone: true,
                        },
                    },
                },
            }),
        ]);

        // Calculate per-drone statistics
        const droneStats = reports.reduce((acc, report) => {
            const droneId = report.mission.droneId;
            const droneName = report.mission.drone.name;

            if (!acc[droneId]) {
                acc[droneId] = {
                    droneId,
                    droneName,
                    missionsCompleted: 0,
                    totalDistance: 0,
                    totalCoverage: 0,
                    totalDuration: 0,
                    avgSpeed: 0,
                };
            }

            acc[droneId].missionsCompleted++;
            acc[droneId].totalDistance += report.distance;
            acc[droneId].totalCoverage += report.coverage;
            acc[droneId].totalDuration += report.duration;
            acc[droneId].avgSpeed =
                (acc[droneId].avgSpeed * (acc[droneId].missionsCompleted - 1) + report.avgSpeed) /
                acc[droneId].missionsCompleted;

            return acc;
        }, {} as Record<string, any>);

        return {
            overview: {
                totalMissions,
                completedMissions,
                activeMissions: totalMissions - completedMissions,
                totalDistance: totalDistance._sum.distance || 0,
                totalCoverage: totalCoverage._sum.coverage || 0,
                totalDuration: totalDuration._sum.duration || 0,
                avgMissionDuration:
                    completedMissions > 0 ? (totalDuration._sum.duration || 0) / completedMissions : 0,
            },
            droneStats: Object.values(droneStats),
        };
    }

    /**
     * Get statistics for a specific drone
     */
    async getDroneStats(droneId: string) {
        const reports = await prisma.surveyReport.findMany({
            where: {
                mission: {
                    droneId,
                },
            },
            include: {
                mission: true,
            },
        });

        const totalMissions = reports.length;
        const totalDistance = reports.reduce((sum, r) => sum + r.distance, 0);
        const totalCoverage = reports.reduce((sum, r) => sum + r.coverage, 0);
        const totalDuration = reports.reduce((sum, r) => sum + r.duration, 0);
        const avgSpeed = reports.reduce((sum, r) => sum + r.avgSpeed, 0) / (totalMissions || 1);

        return {
            droneId,
            totalMissions,
            totalDistance,
            totalCoverage,
            totalDuration,
            avgSpeed,
            avgMissionDuration: totalMissions > 0 ? totalDuration / totalMissions : 0,
        };
    }
}

export const surveyService = new SurveyService();
