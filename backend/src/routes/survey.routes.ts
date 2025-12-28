import { FastifyInstance } from 'fastify';
import { surveyService } from '../services/survey.service';

export async function surveyRoutes(fastify: FastifyInstance) {
    // Get survey report by mission ID
    fastify.get('/surveys/:missionId', async (request, reply) => {
        try {
            const { missionId } = request.params as { missionId: string };
            let report = await surveyService.getSurveyReport(missionId);

            // If report doesn't exist, generate it
            if (!report) {
                report = await surveyService.generateSurveyReport(missionId);
            }

            return reply.send({ success: true, data: report });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Get all survey reports
    fastify.get('/surveys', async (request, reply) => {
        try {
            const reports = await surveyService.getAllSurveyReports();
            return reply.send({ success: true, data: reports });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Get organization-wide statistics
    fastify.get('/surveys/stats/organization', async (request, reply) => {
        try {
            const stats = await surveyService.getOrganizationStats();
            return reply.send({ success: true, data: stats });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });

    // Get drone-specific statistics
    fastify.get('/surveys/stats/drone/:droneId', async (request, reply) => {
        try {
            const { droneId } = request.params as { droneId: string };
            const stats = await surveyService.getDroneStats(droneId);
            return reply.send({ success: true, data: stats });
        } catch (error: any) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
