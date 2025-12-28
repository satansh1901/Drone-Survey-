import React, { useEffect, useState } from 'react';
import { MapView } from '../Map/MapView';
import { useStore } from '../../store/useStore';
import { missionAPI, Mission } from '../../services/api';
import { useWebSocketEvent } from '../../hooks/useWebSocket';
import { Play, Pause, Square, Activity, Clock, Battery, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const MissionMonitor: React.FC = () => {
    const { drones, updateDrone, fetchDrones } = useStore();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

    useEffect(() => {
        fetchDrones();
        loadMissions();

        const interval = setInterval(() => {
            loadMissions();
            fetchDrones(); // Also refresh drones to get latest positions
        }, 2000); // Refresh every 2 seconds

        return () => clearInterval(interval);
    }, []);

    const loadMissions = async () => {
        try {
            // Load all missions and filter for PLANNED, ACTIVE, and PAUSED
            const response = await missionAPI.getAll();
            const relevantMissions = response.data.filter((m: Mission) =>
                m.status === 'PLANNED' || m.status === 'ACTIVE' || m.status === 'PAUSED'
            );
            setMissions(relevantMissions);
        } catch (error) {
            console.error('Failed to load missions:', error);
        }
    };

    // Listen for real-time drone position updates
    useWebSocketEvent('drone:position', (data: any) => {
        console.log('📡 WebSocket drone:position event received:', data);
        updateDrone(data.droneId, {
            latitude: data.latitude,
            longitude: data.longitude,
            altitude: data.altitude,
            battery: data.battery,
            speed: data.speed,
        });
        console.log('✅ Updated drone in store:', data.droneId);
    });

    // Listen for mission progress updates
    useWebSocketEvent('mission:progress', (data: any) => {
        setMissions((prev) =>
            prev.map((m) =>
                m.id === data.missionId
                    ? {
                        ...m,
                        progress: data.progress,
                        currentWaypoint: data.currentWaypoint,
                        distanceCovered: data.distanceCovered,
                    }
                    : m
            )
        );

        if (selectedMission?.id === data.missionId) {
            setSelectedMission((prev) =>
                prev ? { ...prev, progress: data.progress, currentWaypoint: data.currentWaypoint } : null
            );
        }
    });

    // Listen for mission status updates
    useWebSocketEvent('mission:status', () => {
        loadMissions();
    });

    const handleMissionControl = async (missionId: string, action: 'start' | 'pause' | 'resume' | 'abort') => {
        try {
            if (action === 'start') {
                await missionAPI.start(missionId);
            } else if (action === 'pause') {
                await missionAPI.pause(missionId);
            } else if (action === 'resume') {
                await missionAPI.resume(missionId);
            } else if (action === 'abort') {
                if (!confirm('Are you sure you want to abort this mission?')) return;
                await missionAPI.abort(missionId);
            }

            await loadMissions();
            await fetchDrones();
        } catch (error: any) {
            alert(error.response?.data?.error || `Failed to ${action} mission`);
        }
    };

    // Show ALL drones that have positions, not just active ones
    const dronesWithPosition = drones.filter((d) => d.latitude !== null && d.longitude !== null);

    return (
        <div className="flex h-full">
            {/* Map */}
            <div className="flex-1 relative">
                <MapView drones={dronesWithPosition} selectedMission={selectedMission} />

                {/* Drone count indicator */}
                {dronesWithPosition.length > 0 && (
                    <div className="absolute top-4 right-4 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 shadow-lg">
                        <p className="text-sm text-slate-400">Drones on Map</p>
                        <p className="text-2xl font-bold text-white">{dronesWithPosition.length}</p>
                    </div>
                )}
            </div>

            {/* Mission List Panel */}
            <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Mission Control</h2>

                    {missions.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <Activity size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No missions to monitor</p>
                            <p className="text-sm mt-2">Create a mission in Mission Planning</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {missions.map((mission) => (
                            <MissionCard
                                key={mission.id}
                                mission={mission}
                                isSelected={selectedMission?.id === mission.id}
                                onSelect={() => setSelectedMission(mission)}
                                onControl={handleMissionControl}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MissionCard: React.FC<{
    mission: Mission;
    isSelected: boolean;
    onSelect: () => void;
    onControl: (missionId: string, action: 'start' | 'pause' | 'resume' | 'abort') => void;
}> = ({ mission, isSelected, onSelect, onControl }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-500';
            case 'PAUSED':
                return 'bg-yellow-500';
            case 'PLANNED':
                return 'bg-blue-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <div
            onClick={onSelect}
            className={`bg-slate-700 rounded-lg p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-slate-600'
                }`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-semibold text-white">{mission.name}</h3>
                    <p className="text-sm text-slate-400">{mission.drone?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(mission.status)}`} />
                    <span className="text-sm text-white">{mission.status}</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Progress</span>
                    <span>{mission.progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2">
                    <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${mission.progress}%` }}
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                    <Navigation size={14} />
                    <span>
                        {mission.currentWaypoint}/{mission.totalWaypoints} WP
                    </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                    <Activity size={14} />
                    <span>{mission.distanceCovered.toFixed(0)}m</span>
                </div>
                {mission.drone && (
                    <>
                        <div className="flex items-center gap-2 text-slate-300">
                            <Battery size={14} />
                            <span>{mission.drone.battery.toFixed(1)}%</span>
                        </div>
                        {mission.startTime && (
                            <div className="flex items-center gap-2 text-slate-300">
                                <Clock size={14} />
                                <span>{formatDistanceToNow(new Date(mission.startTime), { addSuffix: true })}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
                {mission.status === 'PLANNED' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onControl(mission.id, 'start');
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                    >
                        <Play size={14} />
                        Start Mission
                    </button>
                )}

                {mission.status === 'ACTIVE' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onControl(mission.id, 'pause');
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
                    >
                        <Pause size={14} />
                        Pause
                    </button>
                )}

                {mission.status === 'PAUSED' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onControl(mission.id, 'resume');
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                    >
                        <Play size={14} />
                        Resume
                    </button>
                )}

                {mission.status !== 'PLANNED' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onControl(mission.id, 'abort');
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                    >
                        <Square size={14} />
                        Abort
                    </button>
                )}
            </div>
        </div>
    );
};
