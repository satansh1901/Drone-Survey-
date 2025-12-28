import { FastifyInstance } from 'fastify';
import { missionService } from '../services/mission.service';
import { startMissionSimulation } from '../services/simulation.service';
import { MissionStatus, PathPattern } from '@prisma/client';
import { z } from 'zod';

// Validation schemas
const createMissionSchema = z.object({
    name: z.string().min(1),
    droneId: z.string().uuid(),
    surveyArea: z.array(z.array(z.number()).length(2)).min(3), // Array of [lng, lat]
    pathPattern: z.nativeEnum(PathPattern),
    altitude: z.number().positive(),
    speed: z.number().positive().optional(),
    overlapPercent: z.number().min(0).max(100).optional(),
});

export async function missionRoutes(fastify: FastifyInstance) {
    // Get all missions
    fastify.get('/missions', async (request, reply) => {
        try {
            const { status, droneId } = request.query as {
                status?: MissionStatus;
                droneId?: string;
            };
            const missions = await missionService.getAllMissions({ status, droneId });
            return reply.send({ success: true, data: missions });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Get mission by ID
    fastify.get('/missions/:id', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const mission = await missionService.getMissionById(id);

            if (!mission) {
                return reply.status(404).send({ success: false, error: 'Mission not found' });
            }

            return reply.send({ success: true, data: mission });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Create new mission
    fastify.post('/missions', async (request, reply) => {
        try {
            const data = createMissionSchema.parse(request.body);
            const mission = await missionService.createMission(data);
            return reply.status(201).send({ success: true, data: mission });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return reply.status(400).send({ success: false, error: error.errors });
            }
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Start mission
    fastify.post('/missions/:id/start', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const mission = await missionService.startMission(id);

            // Start simulation in background
            await startMissionSimulation(id);

            return reply.send({
                success: true,
                data: mission,
                message: 'Mission started successfully',
            });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Pause mission
    fastify.post('/missions/:id/pause', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const mission = await missionService.pauseMission(id);
            return reply.send({
                success: true,
                data: mission,
                message: 'Mission paused successfully',
            });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Resume mission
    fastify.post('/missions/:id/resume', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const mission = await missionService.resumeMission(id);

            // Restart simulation
            await startMissionSimulation(id);

            return reply.send({
                success: true,
                data: mission,
                message: 'Mission resumed successfully',
            });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Abort mission
    fastify.post('/missions/:id/abort', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const mission = await missionService.abortMission(id);
            return reply.send({
                success: true,
                data: mission,
                message: 'Mission aborted successfully',
            });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Get active missions
    fastify.get('/missions/active/list', async (_request, reply) => {
        try {
            const missions = await missionService.getActiveMissions();
            return reply.send({ success: true, data: missions });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
