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
import { safeFetch } from './utils/errorHandling';

const defaultIncidentsList: Incident[] = [
  {
    id: 'INC-8812',
    title: 'PHYSICAL ALTERCATION DETECTED',
    location: 'Subway Platform - Zone 4',
    cameraId: 'CAM-001',
    severity: 9.3,
    status: 'Active',
    timestamp: '23:41:02 UTC',
    description: 'High threat physical violent altercation detected by Sentinel AI YOLO vision model.',
    detectedObjects: ['person (3)', 'backpack (1)'],
    aiConfidence: 98.4,
    aiAnalysis: {
      weapon: true,
      weaponConfidence: 95.2,
      fight: true,
      fightConfidence: 92.0,
      people: 3,
      blood: false,
      severity: 9.3,
      trackingIDs: ['TRK-104', 'TRK-105']
    }
  },
  {
    id: 'INC-8811',
    title: 'RESTRICTED INTRUSION ALERT',
    location: 'Main Terminal Lobby',
    cameraId: 'CAM-002',
    severity: 7.4,
    status: 'Active',
    timestamp: '23:38:15 UTC',
    description: 'Unauthorized perimeter crossing detected after operational hours.',
    detectedObjects: ['person (1)'],
    aiConfidence: 94.2,
    aiAnalysis: {
      weapon: false,
      weaponConfidence: 0,
      fight: false,
      fightConfidence: 0,
      people: 1,
      blood: false,
      severity: 7.4,
      trackingIDs: ['TRK-201']
    }
  },
  {
    id: 'INC-8810',
    title: 'UNATTENDED BAGGAGE DETECTED',
    location: 'North Concourse - Gate 12',
    cameraId: 'CAM-003',
    severity: 5.8,
    status: 'Investigating',
    timestamp: '23:25:00 UTC',
    description: 'Unattended suitcase stationary for > 8 minutes.',
    detectedObjects: ['suitcase (1)'],
    aiConfidence: 91.0,
    aiAnalysis: {
      weapon: false,
      weaponConfidence: 0,
      fight: false,
      fightConfidence: 0,
      people: 0,
      blood: false,
      severity: 5.8,
      trackingIDs: []
    }
  }
];

const defaultUnitsList: PatrolUnit[] = [
  {
    id: 'UNIT-402',
    callSign: 'ALPHA-1 (PATROL)',
    status: 'Available',
    location: 'Sector 7G - Downtown',
    officerInCharge: 'Officer Vance',
    vehicleType: 'Interceptor SUV',
    etaMinutes: 2,
    lat: 40.7128,
    lng: -74.0060,
  },
  {
    id: 'UNIT-109',
    callSign: 'BRAVO-4 (TACTICAL)',
    status: 'Dispatched',
    location: 'Subway Platform Zone 4',
    officerInCharge: 'Sgt. Miller',
    vehicleType: 'Rapid Tactical Van',
    etaMinutes: 4,
    lat: 40.7150,
    lng: -74.0020,
  },
  {
    id: 'UNIT-305',
    callSign: 'DELTA-9 (MEDIC)',
    status: 'Available',
    location: 'North Medical Hub',
    officerInCharge: 'Dr. Ross',
    vehicleType: 'Emergency Ambulance',
    etaMinutes: 6,
    lat: 40.7100,
    lng: -74.0100,
  },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [cameras, setCameras] = useState<CameraData[]>(dataService.getCameras());
  const [incidents, setIncidents] = useState<Incident[]>(defaultIncidentsList);
  const [units, setUnits] = useState<PatrolUnit[]>(defaultUnitsList);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(defaultIncidentsList[0]);
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
        const incRes = await safeFetch('/api/v1/incidents/cards?limit=10');
        if (incRes.ok) {
          const incData = await incRes.json();
          if (incData.incidents && incData.incidents.length > 0) {
            setIncidents(incData.incidents);
            setSelectedIncident(incData.incidents[0]);
          }
        }
      } catch (e) {
        console.warn('Backend incidents offline, using local defaults', e);
      }
    };

    if (isAuthenticated) {
      fetchBackendData();
    }

    // Subscribe to DataService updates
    const unsubscribe = dataService.subscribe(() => {
      const cams = dataService.getCameras();
      if (cams && cams.length > 0) {
        setCameras([...cams]);
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentView('command_center');
  };

  const handleLogout = () => {
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-white font-sans select-none">
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
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
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

            {currentView === 'landing' && (
              <LandingPage
                onEnterSystem={() => setCurrentView('command_center')}
                onNavigate={(view) => setCurrentView(view)}
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
