import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { useWebSocket } from './hooks/useWebSocket';
import { FleetDashboard } from './components/Fleet/FleetDashboard';
import { MissionPlanner } from './components/MissionPlanning/MissionPlanner';
import { MissionMonitor } from './components/Mission/MissionMonitor';
import { SurveyReports } from './components/Reports/SurveyReports';
import { Plane, Map, Activity, FileText } from 'lucide-react';

function App() {
    const { currentView, setCurrentView } = useStore();

    useEffect(() => {
        // WebSocket is automatically connected via the hook
        useWebSocket();
    }, []);

    const renderView = () => {
        switch (currentView) {
            case 'fleet':
                return <FleetDashboard />;
            case 'planning':
                return <MissionPlanner />;
            case 'monitoring':
                return <MissionMonitor />;
            case 'reports':
                return <SurveyReports />;
            default:
                return <FleetDashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-900">
            {/* Sidebar */}
            <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-slate-700">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Plane className="text-blue-500" size={28} />
                        DroneOps
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Survey Management</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    <NavButton
                        icon={<Plane size={20} />}
                        label="Fleet Management"
                        active={currentView === 'fleet'}
                        onClick={() => setCurrentView('fleet')}
                    />
                    <NavButton
                        icon={<Map size={20} />}
                        label="Mission Planning"
                        active={currentView === 'planning'}
                        onClick={() => setCurrentView('planning')}
                    />
                    <NavButton
                        icon={<Activity size={20} />}
                        label="Live Monitoring"
                        active={currentView === 'monitoring'}
                        onClick={() => setCurrentView('monitoring')}
                    />
                    <NavButton
                        icon={<FileText size={20} />}
                        label="Reports & Analytics"
                        active={currentView === 'reports'}
                        onClick={() => setCurrentView('reports')}
                    />
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        System Online
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">{renderView()}</div>
        </div>
    );
}

const NavButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
    >
        {icon}
        <span className="font-medium">{label}</span>
    </button>
);

export default App;
