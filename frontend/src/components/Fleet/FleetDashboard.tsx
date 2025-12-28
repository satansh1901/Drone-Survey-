import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { fleetAPI } from '../../services/api';
import { useWebSocketEvent } from '../../hooks/useWebSocket';
import { Plane, Battery, Plus, Trash2 } from 'lucide-react';

export const FleetDashboard: React.FC = () => {
    const { drones, updateDrone, fetchDrones } = useStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [fleetStats, setFleetStats] = useState<any>(null);

    useEffect(() => {
        fetchDrones();
        loadFleetStats();
    }, []);

    const loadFleetStats = async () => {
        try {
            const response = await fleetAPI.getStats();
            setFleetStats(response.data);
        } catch (error) {
            console.error('Failed to load fleet stats:', error);
        }
    };

    // Listen for real-time drone status updates
    useWebSocketEvent('drone:status', (data: any) => {
        updateDrone(data.droneId, { status: data.status });
    });

    // Listen for fleet stats updates
    useWebSocketEvent('fleet:stats', (data: any) => {
        setFleetStats(data);
    });

    const handleDeleteDrone = async (id: string) => {
        if (!confirm('Are you sure you want to delete this drone?')) return;

        try {
            await fleetAPI.delete(id);
            await fetchDrones();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to delete drone');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return 'bg-green-500';
            case 'IN_MISSION':
                return 'bg-blue-500';
            case 'CHARGING':
                return 'bg-yellow-500';
            case 'MAINTENANCE':
                return 'bg-orange-500';
            case 'OFFLINE':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getBatteryColor = (battery: number) => {
        if (battery > 60) return 'text-green-500';
        if (battery > 30) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Fleet Management</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    Add Drone
                </button>
            </div>

            {/* Fleet Statistics */}
            {fleetStats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard label="Total" value={fleetStats.total} color="bg-slate-700" />
                    <StatCard label="Available" value={fleetStats.available} color="bg-green-600" />
                    <StatCard label="In Mission" value={fleetStats.inMission} color="bg-blue-600" />
                    <StatCard label="Charging" value={fleetStats.charging} color="bg-yellow-600" />
                    <StatCard label="Maintenance" value={fleetStats.maintenance} color="bg-orange-600" />
                    <StatCard label="Offline" value={fleetStats.offline} color="bg-red-600" />
                </div>
            )}

            {/* Drone List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drones.map((drone) => (
                    <div
                        key={drone.id}
                        className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-700 rounded-lg">
                                    <Plane size={24} className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{drone.name}</h3>
                                    <p className="text-sm text-slate-400">{drone.model}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDeleteDrone(drone.id)}
                                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                                >
                                    <Trash2 size={16} className="text-red-400" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Status</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(drone.status)}`} />
                                    <span className="text-sm text-white">{drone.status}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Battery</span>
                                <div className="flex items-center gap-2">
                                    <Battery size={16} className={getBatteryColor(drone.battery)} />
                                    <span className={`text-sm font-semibold ${getBatteryColor(drone.battery)}`}>
                                        {drone.battery.toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Speed</span>
                                <span className="text-sm text-white">{drone.speed} m/s</span>
                            </div>

                            {drone.latitude && drone.longitude && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Position</span>
                                    <span className="text-xs text-slate-400">
                                        {drone.latitude.toFixed(4)}, {drone.longitude.toFixed(4)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {drones.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Plane size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No drones in fleet. Add your first drone to get started.</p>
                </div>
            )}

            {/* Add Drone Modal */}
            {showAddModal && (
                <AddDroneModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchDrones();
                    }}
                />
            )}
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({
    label,
    value,
    color,
}) => (
    <div className={`${color} rounded-lg p-4`}>
        <p className="text-sm text-white/80">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
    </div>
);

const AddDroneModal: React.FC<{
    onClose: () => void;
    onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        model: '',
        speed: 10,
        maxSpeed: 15,
        maxAltitude: 120,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await fleetAPI.create(formData);
            onSuccess();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to add drone');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold text-white mb-4">Add New Drone</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Model</label>
                        <input
                            type="text"
                            required
                            value={formData.model}
                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Speed (m/s)</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.speed}
                                onChange={(e) => setFormData({ ...formData, speed: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Max Speed</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.maxSpeed}
                                onChange={(e) =>
                                    setFormData({ ...formData, maxSpeed: parseFloat(e.target.value) })
                                }
                                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Max Alt (m)</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.maxAltitude}
                                onChange={(e) =>
                                    setFormData({ ...formData, maxAltitude: parseFloat(e.target.value) })
                                }
                                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                            Add Drone
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
