import React, { useState, useEffect } from 'react';
import { MapView } from '../Map/MapView';
import { useStore } from '../../store/useStore';
import { missionAPI } from '../../services/api';
import { Map, Grid, Circle, GitBranch, Send } from 'lucide-react';

export const MissionPlanner: React.FC = () => {
    const { drones, fetchDrones } = useStore();
    const [drawMode, setDrawMode] = useState(false);
    const [surveyArea, setSurveyArea] = useState<number[][] | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        droneId: '',
        pathPattern: 'GRID' as 'GRID' | 'PERIMETER' | 'CROSSHATCH',
        altitude: 50,
        speed: 10,
        overlapPercent: 70,
    });

    useEffect(() => {
        fetchDrones();
    }, []);

    const availableDrones = drones.filter((d) => d.status === 'AVAILABLE');

    const handlePolygonDrawn = (coordinates: number[][]) => {
        setSurveyArea(coordinates);
        setDrawMode(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!surveyArea) {
            alert('Please draw a survey area on the map');
            return;
        }

        if (!formData.droneId) {
            alert('Please select a drone');
            return;
        }

        try {
            const response = await missionAPI.create({
                ...formData,
                surveyArea,
            });

            alert('Mission created successfully!');

            // Reset form
            setSurveyArea(null);
            setFormData({
                name: '',
                droneId: '',
                pathPattern: 'GRID',
                altitude: 50,
                speed: 10,
                overlapPercent: 70,
            });
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to create mission');
        }
    };

    return (
        <div className="flex h-full">
            {/* Map */}
            <div className="flex-1 relative">
                <MapView
                    drones={drones}
                    onPolygonDrawn={handlePolygonDrawn}
                    drawMode={drawMode}
                />

                {/* Draw Button */}
                {!drawMode && !surveyArea && (
                    <button
                        onClick={() => setDrawMode(true)}
                        className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors z-10"
                    >
                        <Map size={20} />
                        Draw Survey Area
                    </button>
                )}

                {surveyArea && (
                    <div className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-10">
                        ✓ Survey area defined
                    </div>
                )}
            </div>

            {/* Configuration Panel */}
            <div className="w-96 bg-slate-800 border-l border-slate-700 p-6 overflow-y-auto">
                <h2 className="text-2xl font-bold text-white mb-6">Mission Planning</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Mission Name */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Mission Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                            placeholder="e.g., Survey Mission 1"
                        />
                    </div>

                    {/* Drone Selection */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Select Drone</label>
                        <select
                            required
                            value={formData.droneId}
                            onChange={(e) => setFormData({ ...formData, droneId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                        >
                            <option value="">Choose a drone...</option>
                            {availableDrones.map((drone) => (
                                <option key={drone.id} value={drone.id}>
                                    {drone.name} ({drone.model}) - Battery: {drone.battery.toFixed(0)}%
                                </option>
                            ))}
                        </select>
                        {availableDrones.length === 0 && (
                            <p className="text-xs text-yellow-500 mt-1">No available drones</p>
                        )}
                    </div>

                    {/* Flight Pattern */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Flight Pattern</label>
                        <div className="grid grid-cols-3 gap-2">
                            <PatternButton
                                icon={<Grid size={20} />}
                                label="Grid"
                                active={formData.pathPattern === 'GRID'}
                                onClick={() => setFormData({ ...formData, pathPattern: 'GRID' })}
                            />
                            <PatternButton
                                icon={<Circle size={20} />}
                                label="Perimeter"
                                active={formData.pathPattern === 'PERIMETER'}
                                onClick={() => setFormData({ ...formData, pathPattern: 'PERIMETER' })}
                            />
                            <PatternButton
                                icon={<GitBranch size={20} />}
                                label="Crosshatch"
                                active={formData.pathPattern === 'CROSSHATCH'}
                                onClick={() => setFormData({ ...formData, pathPattern: 'CROSSHATCH' })}
                            />
                        </div>
                    </div>

                    {/* Altitude */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">
                            Altitude: {formData.altitude}m
                        </label>
                        <input
                            type="range"
                            min="20"
                            max="120"
                            step="5"
                            value={formData.altitude}
                            onChange={(e) =>
                                setFormData({ ...formData, altitude: parseFloat(e.target.value) })
                            }
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>20m</span>
                            <span>120m</span>
                        </div>
                    </div>

                    {/* Speed */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">
                            Speed: {formData.speed} m/s
                        </label>
                        <input
                            type="range"
                            min="5"
                            max="20"
                            step="1"
                            value={formData.speed}
                            onChange={(e) => setFormData({ ...formData, speed: parseFloat(e.target.value) })}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>5 m/s</span>
                            <span>20 m/s</span>
                        </div>
                    </div>

                    {/* Overlap Percentage */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">
                            Overlap: {formData.overlapPercent}%
                        </label>
                        <input
                            type="range"
                            min="50"
                            max="90"
                            step="5"
                            value={formData.overlapPercent}
                            onChange={(e) =>
                                setFormData({ ...formData, overlapPercent: parseFloat(e.target.value) })
                            }
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>50%</span>
                            <span>90%</span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!surveyArea || !formData.droneId}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
                    >
                        <Send size={20} />
                        Create Mission
                    </button>
                </form>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-slate-700 rounded-lg">
                    <h3 className="font-semibold text-white mb-2">Instructions</h3>
                    <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                        <li>Click "Draw Survey Area" to define the area</li>
                        <li>Draw a polygon on the map</li>
                        <li>Select an available drone</li>
                        <li>Configure flight parameters</li>
                        <li>Click "Create Mission"</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

const PatternButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${active
                ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                : 'border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500'
            }`}
    >
        {icon}
        <span className="text-xs font-medium">{label}</span>
    </button>
);
