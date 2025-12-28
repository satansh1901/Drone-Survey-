import { create } from 'zustand';
import { Drone, Mission, fleetAPI, missionAPI } from '../services/api';

interface AppState {
    // Drones
    drones: Drone[];
    selectedDrone: Drone | null;
    setDrones: (drones: Drone[]) => void;
    setSelectedDrone: (drone: Drone | null) => void;
    updateDrone: (id: string, updates: Partial<Drone>) => void;
    fetchDrones: () => Promise<void>;

    // Missions
    missions: Mission[];
    selectedMission: Mission | null;
    activeMissions: Mission[];
    setMissions: (missions: Mission[]) => void;
    setSelectedMission: (mission: Mission | null) => void;
    updateMission: (id: string, updates: Partial<Mission>) => void;
    fetchMissions: () => Promise<void>;
    fetchActiveMissions: () => Promise<void>;

    // UI State
    currentView: 'fleet' | 'planning' | 'monitoring' | 'reports';
    setCurrentView: (view: 'fleet' | 'planning' | 'monitoring' | 'reports') => void;
}

export const useStore = create<AppState>((set) => ({
    // Drones
    drones: [],
    selectedDrone: null,
    setDrones: (drones) => set({ drones }),
    setSelectedDrone: (drone) => set({ selectedDrone: drone }),
    updateDrone: (id, updates) =>
        set((state) => ({
            drones: state.drones.map((d) => (d.id === id ? { ...d, ...updates } : d)),
            selectedDrone:
                state.selectedDrone?.id === id
                    ? { ...state.selectedDrone, ...updates }
                    : state.selectedDrone,
        })),
    fetchDrones: async () => {
        try {
            const response = await fleetAPI.getAll();
            set({ drones: response.data });
        } catch (error) {
            console.error('Failed to fetch drones:', error);
        }
    },

    // Missions
    missions: [],
    selectedMission: null,
    activeMissions: [],
    setMissions: (missions) => set({ missions }),
    setSelectedMission: (mission) => set({ selectedMission: mission }),
    updateMission: (id, updates) =>
        set((state) => ({
            missions: state.missions.map((m) => (m.id === id ? { ...m, ...updates } : m)),
            activeMissions: state.activeMissions.map((m) => (m.id === id ? { ...m, ...updates } : m)),
            selectedMission:
                state.selectedMission?.id === id
                    ? { ...state.selectedMission, ...updates }
                    : state.selectedMission,
        })),
    fetchMissions: async () => {
        try {
            const response = await missionAPI.getAll();
            set({ missions: response.data });
        } catch (error) {
            console.error('Failed to fetch missions:', error);
        }
    },
    fetchActiveMissions: async () => {
        try {
            const response = await missionAPI.getActive();
            set({ activeMissions: response.data });
        } catch (error) {
            console.error('Failed to fetch active missions:', error);
        }
    },

    // UI State
    currentView: 'fleet',
    setCurrentView: (view) => set({ currentView: view }),
}));
