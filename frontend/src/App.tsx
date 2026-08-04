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

const madanapalleIncidents: Incident[] = [
  {
    id: 'INC-MDP-8812',
    title: 'VEHICLE ACCIDENT & IMPACT DETECTED',
    location: 'MITS College Junction - Sector 1, Madanapalle',
    cameraId: 'CAM-MDP-01',
    severity: 9.3,
    status: 'Active',
    timestamp: '23:41:02 UTC',
    description: 'High impact vehicle crash detected near MITS Engineering College entrance by Sentinel YOLO vision model.',
    detectedObjects: ['car (2)', 'person (3)'],
    aiConfidence: 98.4,
    lat: 13.6288,
    lng: 78.4746,
    aiAnalysis: {
      weapon: false,
      weaponConfidence: 0,
      fight: true,
      fightConfidence: 94.0,
      people: 3,
      blood: false,
      severity: 9.3,
      trackingIDs: [101, 102]
    }
  },
  {
    id: 'INC-MDP-8811',
    title: 'WEAPON SIGNATURE LOCK ALERT',
    location: 'RTC Bus Stand Circle - Sector 2, Madanapalle',
    cameraId: 'CAM-MDP-02',
    severity: 7.4,
    status: 'Active',
    timestamp: '23:38:15 UTC',
    description: 'Suspect carrying metallic weapon object logged by town center surveillance stream.',
    detectedObjects: ['person (2)', 'weapon (1)'],
    aiConfidence: 95.2,
    lat: 13.6315,
    lng: 78.4820,
    aiAnalysis: {
      weapon: true,
      weaponConfidence: 95.2,
      fight: false,
      fightConfidence: 0,
      people: 2,
      blood: false,
      severity: 7.4,
      trackingIDs: [201]
    }
  },
  {
    id: 'INC-MDP-8810',
    title: 'SMOKE & FIRE ANOMALY DETECTED',
    location: 'Patel Road Kadiri Junction - Sector 3, Madanapalle',
    cameraId: 'CAM-MDP-03',
    severity: 5.8,
    status: 'Investigating',
    timestamp: '23:25:00 UTC',
    description: 'Thermal anomaly and smoke plume flagged near commercial district.',
    detectedObjects: ['fire (1)'],
    aiConfidence: 89.0,
    lat: 13.6240,
    lng: 78.4680,
    aiAnalysis: {
      weapon: false,
      weaponConfidence: 0,
      fight: false,
      fightConfidence: 0,
      people: 0,
      blood: false,
      severity: 5.8,
      trackingIDs: [301]
    }
  }
];

const madanapalleUnits: PatrolUnit[] = [
  {
    id: 'UNIT-MDP-402',
    name: 'MADANAPALLE PATROL 402 (ALPHA-1)',
    officers: ['Officer K. Reddy', 'Officer S. Naidu'],
    badge: 'AP-POL-402',
    status: 'PATROLLING',
    statusColor: 'success',
    vehicle: 'Mahindra Bolero Police Interceptor',
    location: 'Sector 1 - MITS Campus Zone, Madanapalle',
    lat: 13.6288,
    lng: 78.4746,
    distance: '0.5 km',
    eta: '2 mins',
    radioChannel: 'CH-1 (MADANAPALLE CENTRAL)',
    equipment: ['Taser 7', 'BodyCam v4', 'First Aid Kit'],
  },
  {
    id: 'UNIT-MDP-109',
    name: 'RTC BUS STAND TACTICAL 109 (BRAVO-4)',
    officers: ['Sgt. M. Rao', 'Constable V. Kumar'],
    badge: 'AP-POL-109',
    status: 'DISPATCHED',
    statusColor: 'danger',
    vehicle: 'Rapid Emergency Response Van',
    location: 'Sector 2 - Bus Stand Circle, Madanapalle',
    lat: 13.6315,
    lng: 78.4820,
    distance: '1.2 km',
    eta: '3 mins',
    radioChannel: 'CH-3 (EMERGENCY OVERRIDE)',
    equipment: ['Shields', 'Thermal Scanner', 'Defibrillator'],
  },
  {
    id: 'UNIT-MDP-305',
    name: 'HIGHWAY PATROL 305 (ANGALLU AIRBORNE)',
    officers: ['Capt. D. Sharma', 'Lt. A. Verma'],
    badge: 'AP-AIR-305',
    status: 'AIRBORNE',
    statusColor: 'info',
    vehicle: 'NH-71 Highway Drone / Patrol Helicopter',
    location: 'Sector 4 - Angallu Highway Bypass, Madanapalle',
    lat: 13.6350,
    lng: 78.4910,
    distance: '1.8 km',
    eta: '1 min',
    radioChannel: 'CH-5 (HIGHWAY AIR LINK)',
    equipment: ['FLIR Camera', 'Megaphone Array', 'Searchlight'],
  },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [cameras, setCameras] = useState<CameraData[]>(dataService.getCameras());
  const [incidents, setIncidents] = useState<Incident[]>(madanapalleIncidents);
  const [units, setUnits] = useState<PatrolUnit[]>(madanapalleUnits);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(madanapalleIncidents[0]);
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
        console.warn('Backend incidents offline, using Madanapalle defaults', e);
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
