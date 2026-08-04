import React, { useState, useEffect } from 'react';
import { ViewType, Incident, CameraData, PatrolUnit } from './types';
import { dataService, authService } from './data/dataService';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './components/views/LandingPage';
import { CommandCenterView } from './components/views/CommandCenterView';
import { LiveCamerasView } from './components/views/LiveCamerasView';
import { InvestigationView } from './components/views/InvestigationView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { FleetUnitsView } from './components/views/FleetUnitsView';
import { QuickDispatchModal } from './components/modals/QuickDispatchModal';
import { PrintReportModal } from './components/modals/PrintReportModal';
import { FullscreenCameraModal } from './components/modals/FullscreenCameraModal';
import { LoginPage } from './components/auth/LoginPage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [cameras, setCameras] = useState<CameraData[]>(dataService.getCameras());
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [units, setUnits] = useState<PatrolUnit[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [fullscreenCamera, setFullscreenCamera] = useState<CameraData | null>(null);

  // Modals state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    if (authService.isAuthenticated()) {
      setIsAuthenticated(true);
      setCurrentView('command_center');
    }
  }, []);

  // Load real data from backend
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const token = authService.getToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch incidents from backend
        const incRes = await fetch('/api/v1/incidents/cards?limit=10', { headers });
        if (incRes.ok) {
          const incData = await incRes.json();
          setIncidents(incData.incidents || []);
          if (incData.incidents && incData.incidents.length > 0) {
            setSelectedIncident(incData.incidents[0]);
          }
        }

        // Fetch units (mock for now - would need backend endpoint)
        const unitRes = await fetch('/mock/users.json');
        if (unitRes.ok) {
          const unitData = await unitRes.json();
          setUnits(unitData);
        }
      } catch (e) {
        console.error('Error loading backend data:', e);
      }
    };

    if (isAuthenticated) {
      fetchBackendData();
    }

    // Subscribe to DataService updates
    const unsubscribe = dataService.subscribe(() => {
      setCameras([...dataService.getCameras()]);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentView('command_center');
  };

  const handleLogout = async () => {
    try {
      const token = authService.getToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
    
    authService.clearAuth();
    setIsAuthenticated(false);
    setCurrentView('landing');
  };

  const handleConfirmDispatch = (unitId: string, incidentId: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? { ...inc, status: 'Dispatched', assignedUnit: unitId }
          : inc
      )
    );
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 text-white font-sans">
      {/* Main Layout */}
      <div className="flex flex-col h-full w-full overflow-hidden">
        {/* Main Top Header */}
        <Navbar
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          onQuickDispatch={() => setIsDispatchModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Main Workspace Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Collapsible Sidebar */}
          <Sidebar
            currentView={currentView}
            onNavigate={(view) => setCurrentView(view)}
            activeCriticalAlertsCount={incidents.filter((i) => i.severity >= 8.0).length}
          />

          {/* Dynamic View Container */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-900">
            {currentView === 'command_center' && (
              <CommandCenterView
                incidents={incidents}
                cameras={cameras}
                units={units}
                onSelectIncident={(inc) => {
                  setSelectedIncident(inc);
                  setCurrentView('investigation');
                }}
                onExpandCamera={(cam) => setFullscreenCamera(cam)}
                onQuickDispatch={() => setIsDispatchModalOpen(true)}
                onNavigate={(view) => setCurrentView(view)}
              />
            )}

            {currentView === 'live_cameras' && (
              <LiveCamerasView
                cameras={cameras}
                onExpandCamera={(cam) => setFullscreenCamera(cam)}
              />
            )}

            {currentView === 'investigation' && (
              <InvestigationView
                incident={selectedIncident || incidents[0]}
                camera={cameras.find((c) => c.id === selectedIncident?.cameraId)}
                onOpenPrintReport={() => setIsPrintModalOpen(true)}
                onCloseIncident={() => setCurrentView('command_center')}
              />
            )}

            {currentView === 'analytics' && <AnalyticsView />}

            {currentView === 'fleet_units' && (
              <FleetUnitsView
                units={units}
                onDispatchUnit={() => setIsDispatchModalOpen(true)}
              />
            )}
          </main>
        </div>

        {/* System Footer */}
        <Footer />
      </div>

      {/* Global Modals */}
      <QuickDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        incidents={incidents}
        units={units}
        onConfirmDispatch={handleConfirmDispatch}
      />

      {selectedIncident && (
        <PrintReportModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          incident={selectedIncident}
        />
      )}

      <FullscreenCameraModal
        camera={fullscreenCamera}
        onClose={() => setFullscreenCamera(null)}
      />
    </div>
  );
}
