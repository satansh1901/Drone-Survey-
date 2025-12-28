import { FastifyInstance } from 'fastify';
import { fleetService } from '../services/fleet.service';
import { DroneStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schemas
const createDroneSchema = z.object({
    name: z.string().min(1),
    model: z.string().min(1),
    speed: z.number().positive().optional(),
    maxSpeed: z.number().positive().optional(),
    maxAltitude: z.number().positive().optional(),
});

const updateDroneSchema = z.object({
    name: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    status: z.nativeEnum(DroneStatus).optional(),
    battery: z.number().min(0).max(100).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    altitude: z.number().optional(),
    speed: z.number().positive().optional(),
    maxSpeed: z.number().positive().optional(),
    maxAltitude: z.number().positive().optional(),
});

export async function fleetRoutes(fastify: FastifyInstance) {
    // Get all drones
    fastify.get('/fleet', async (request, reply) => {
        try {
            const { status } = request.query as { status?: DroneStatus };
            const drones = await fleetService.getAllDrones(status);
            return reply.send({ success: true, data: drones });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Get drone by ID
    fastify.get('/fleet/:id', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const drone = await fleetService.getDroneById(id);

            if (!drone) {
                return reply.status(404).send({ success: false, error: 'Drone not found' });
            }

            return reply.send({ success: true, data: drone });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Create new drone
    fastify.post('/fleet', async (request, reply) => {
        try {
            const data = createDroneSchema.parse(request.body);
            const drone = await fleetService.createDrone(data);
            return reply.status(201).send({ success: true, data: drone });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return reply.status(400).send({ success: false, error: error.errors });
            }
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Update drone
    fastify.put('/fleet/:id', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const data = updateDroneSchema.parse(request.body);
            const drone = await fleetService.updateDrone(id, data);
            return reply.send({ success: true, data: drone });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return reply.status(400).send({ success: false, error: error.errors });
            }
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Delete drone
    fastify.delete('/fleet/:id', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            await fleetService.deleteDrone(id);
            return reply.send({ success: true, message: 'Drone deleted successfully' });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Get fleet statistics
    fastify.get('/fleet/stats/overview', async (request, reply) => {
        try {
            const stats = await fleetService.getFleetStatistics();
            return reply.send({ success: true, data: stats });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
