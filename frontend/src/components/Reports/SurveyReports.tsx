import React, { useEffect, useState } from 'react';
import { surveyAPI, SurveyReport } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, TrendingUp, Clock, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const SurveyReports: React.FC = () => {
    const [reports, setReports] = useState<SurveyReport[]>([]);
    const [orgStats, setOrgStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [reportsRes, statsRes] = await Promise.all([
                surveyAPI.getAllReports(),
                surveyAPI.getOrganizationStats(),
            ]);

            setReports(reportsRes.data);
            setOrgStats(statsRes.data);
        } catch (error) {
            console.error('Failed to load reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-slate-400">Loading reports...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Survey Reports & Analytics</h1>
                <p className="text-slate-400 mt-1">Organization-wide mission statistics and insights</p>
            </div>

            {/* Organization Overview */}
            {orgStats && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={<FileText size={24} />}
                            label="Total Missions"
                            value={orgStats.overview.totalMissions}
                            color="bg-blue-600"
                        />
                        <StatCard
                            icon={<TrendingUp size={24} />}
                            label="Completed"
                            value={orgStats.overview.completedMissions}
                            color="bg-green-600"
                        />
                        <StatCard
                            icon={<MapPin size={24} />}
                            label="Total Coverage"
                            value={`${(orgStats.overview.totalCoverage / 1000).toFixed(1)} km²`}
                            color="bg-purple-600"
                        />
                        <StatCard
                            icon={<Clock size={24} />}
                            label="Total Flight Time"
                            value={`${(orgStats.overview.totalDuration / 3600).toFixed(1)} hrs`}
                            color="bg-orange-600"
                        />
                    </div>

                    {/* Per-Drone Statistics Chart */}
                    {orgStats.droneStats && orgStats.droneStats.length > 0 && (
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                            <h2 className="text-xl font-bold text-white mb-4">Drone Performance</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={orgStats.droneStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="droneName" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #475569',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="missionsCompleted" fill="#3b82f6" name="Missions" />
                                    <Bar dataKey="totalDistance" fill="#10b981" name="Distance (m)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Drone Stats Table */}
                    {orgStats.droneStats && orgStats.droneStats.length > 0 && (
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                            <h2 className="text-xl font-bold text-white mb-4">Detailed Drone Statistics</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-3 px-4 text-slate-400 font-semibold">Drone</th>
                                            <th className="text-right py-3 px-4 text-slate-400 font-semibold">Missions</th>
                                            <th className="text-right py-3 px-4 text-slate-400 font-semibold">Distance</th>
                                            <th className="text-right py-3 px-4 text-slate-400 font-semibold">Coverage</th>
                                            <th className="text-right py-3 px-4 text-slate-400 font-semibold">Avg Speed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orgStats.droneStats.map((stat: any) => (
                                            <tr key={stat.droneId} className="border-b border-slate-700/50">
                                                <td className="py-3 px-4 text-white">{stat.droneName}</td>
                                                <td className="text-right py-3 px-4 text-slate-300">
                                                    {stat.missionsCompleted}
                                                </td>
                                                <td className="text-right py-3 px-4 text-slate-300">
                                                    {(stat.totalDistance / 1000).toFixed(2)} km
                                                </td>
                                                <td className="text-right py-3 px-4 text-slate-300">
                                                    {(stat.totalCoverage / 1000).toFixed(2)} km²
                                                </td>
                                                <td className="text-right py-3 px-4 text-slate-300">
                                                    {stat.avgSpeed.toFixed(1)} m/s
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Mission Reports */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">Recent Mission Reports</h2>

                {reports.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No completed missions yet</p>
                    </div>
                )}

                <div className="space-y-4">
                    {reports.slice(0, 10).map((report) => (
                        <ReportCard key={report.id} report={report} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}> = ({ icon, label, value, color }) => (
    <div className={`${color} rounded-lg p-4 flex items-center gap-4`}>
        <div className="text-white/80">{icon}</div>
        <div>
            <p className="text-sm text-white/80">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const ReportCard: React.FC<{ report: SurveyReport }> = ({ report }) => {
    return (
        <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-semibold text-white">{report.mission?.name || 'Mission'}</h3>
                    <p className="text-sm text-slate-400">
                        {report.mission?.drone?.name} • {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                    </p>
                </div>
                <div className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">
                    Completed
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <p className="text-slate-400">Duration</p>
                    <p className="text-white font-semibold">
                        {Math.floor(report.duration / 60)}m {Math.floor(report.duration % 60)}s
                    </p>
                </div>
                <div>
                    <p className="text-slate-400">Distance</p>
                    <p className="text-white font-semibold">{(report.distance / 1000).toFixed(2)} km</p>
                </div>
                <div>
                    <p className="text-slate-400">Coverage</p>
                    <p className="text-white font-semibold">{(report.coverage / 1000).toFixed(2)} km²</p>
                </div>
                <div>
                    <p className="text-slate-400">Waypoints</p>
                    <p className="text-white font-semibold">
                        {report.waypointsReached}/{report.waypointsTotal}
                    </p>
                </div>
                <div>
                    <p className="text-slate-400">Avg Speed</p>
                    <p className="text-white font-semibold">{report.avgSpeed.toFixed(1)} m/s</p>
                </div>
                <div>
                    <p className="text-slate-400">Battery Used</p>
                    <p className="text-white font-semibold">{report.batteryUsed.toFixed(1)}%</p>
                </div>
                <div>
                    <p className="text-slate-400">Pattern</p>
                    <p className="text-white font-semibold">{report.metadata?.pathPattern || 'N/A'}</p>
                </div>
                <div>
                    <p className="text-slate-400">Completion</p>
                    <p className="text-white font-semibold">
                        {report.metadata?.completionRate?.toFixed(1) || 0}%
                    </p>
                </div>
            </div>
        </div>
    );
};
