import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Types
export interface Drone {
    id: string;
    name: string;
    model: string;
    status: 'AVAILABLE' | 'IN_MISSION' | 'CHARGING' | 'MAINTENANCE' | 'OFFLINE';
    battery: number;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    speed: number;
    maxSpeed: number;
    maxAltitude: number;
    createdAt: string;
    updatedAt: string;
}

export interface Mission {
    id: string;
    name: string;
    droneId: string;
    drone?: Drone;
    status: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABORTED' | 'FAILED';
    surveyArea: number[][];
    pathPattern: 'GRID' | 'PERIMETER' | 'CROSSHATCH';
    altitude: number;
    speed: number;
    overlapPercent: number;
    progress: number;
    currentWaypoint: number;
    totalWaypoints: number;
    startTime?: string;
    endTime?: string;
    estimatedTime?: number;
    actualTime?: number;
    distanceCovered: number;
    areaCovered: number;
    createdAt: string;
    updatedAt: string;
    waypoints?: Waypoint[];
}

export interface Waypoint {
    id: string;
    missionId: string;
    sequence: number;
    latitude: number;
    longitude: number;
    altitude: number;
    reached: boolean;
    reachedAt?: string;
}

export interface SurveyReport {
    id: string;
    missionId: string;
    mission?: Mission;
    duration: number;
    distance: number;
    coverage: number;
    waypointsTotal: number;
    waypointsReached: number;
    avgSpeed: number;
    maxSpeed: number;
    avgAltitude: number;
    batteryUsed: number;
    metadata?: any;
    createdAt: string;
}

// Fleet API
export const fleetAPI = {
    getAll: async (status?: string) => {
        const response = await api.get('/fleet', { params: { status } });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get(`/fleet/${id}`);
        return response.data;
    },

    create: async (data: {
        name: string;
        model: string;
        speed?: number;
        maxSpeed?: number;
        maxAltitude?: number;
    }) => {
        const response = await api.post('/fleet', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Drone>) => {
        const response = await api.put(`/fleet/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/fleet/${id}`);
        return response.data;
    },

    getStats: async () => {
        const response = await api.get('/fleet/stats/overview');
        return response.data;
    },
};

// Mission API
export const missionAPI = {
    getAll: async (filters?: { status?: string; droneId?: string }) => {
        const response = await api.get('/missions', { params: filters });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get(`/missions/${id}`);
        return response.data;
    },

    create: async (data: {
        name: string;
        droneId: string;
        surveyArea: number[][];
        pathPattern: 'GRID' | 'PERIMETER' | 'CROSSHATCH';
        altitude: number;
        speed?: number;
        overlapPercent?: number;
    }) => {
        const response = await api.post('/missions', data);
        return response.data;
    },

    start: async (id: string) => {
        const response = await api.post(`/missions/${id}/start`);
        return response.data;
    },

    pause: async (id: string) => {
        const response = await api.post(`/missions/${id}/pause`);
        return response.data;
    },

    resume: async (id: string) => {
        const response = await api.post(`/missions/${id}/resume`);
        return response.data;
    },

    abort: async (id: string) => {
        const response = await api.post(`/missions/${id}/abort`);
        return response.data;
    },

    getActive: async () => {
        const response = await api.get('/missions/active/list');
        return response.data;
    },
};

// Survey API
export const surveyAPI = {
    getReport: async (missionId: string) => {
        const response = await api.get(`/surveys/${missionId}`);
        return response.data;
    },

    getAllReports: async () => {
        const response = await api.get('/surveys');
        return response.data;
    },

    getOrganizationStats: async () => {
        const response = await api.get('/surveys/stats/organization');
        return response.data;
    },

    getDroneStats: async (droneId: string) => {
        const response = await api.get(`/surveys/stats/drone/${droneId}`);
        return response.data;
    },
};

export default api;
