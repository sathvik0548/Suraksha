import { CameraData, Incident, PatrolUnit, EvidenceItem } from '../types';
import { safeFetch, getUserFriendlyError } from '../utils/errorHandling';

interface BackendCamera {
  camera_id: string;
  camera_name: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  zone: string;
  risk_level: string;
  status: string;
  video_source: string;
  camera_type: string;
  created_at: string;
}

const defaultCamerasList: CameraData[] = [
  {
    id: 'CAM-MDP-01',
    name: 'MITS College Junction CCTV 01',
    location: 'Sector 1 - MITS Campus, Madanapalle, AP',
    status: 'REC',
    fps: '30.0 FPS',
    resolution: '1080p FHD',
    aiStatus: 'CRITICAL AI ALERT',
    aiStatusType: 'danger',
    severity: 9.3,
    lat: 13.6288,
    lng: 78.4746,
    videoUrl: '/assets/videos/accident/accident_001.mp4',
    detections: [
      { id: 1, type: 'car', label: 'Car Collision (94%)', confidence: 0.94, x: 20, y: 35, w: 40, h: 45, color: '#ef4444', trackId: 'TRK-101' },
      { id: 2, type: 'person', label: 'Pedestrian (89%)', confidence: 0.89, x: 65, y: 40, w: 15, h: 35, color: '#3b82f6', trackId: 'TRK-102' }
    ],
    aiMetrics: { weapon: false, weaponConfidence: 0, fight: true, fightConfidence: 94, people: 3, blood: false, severity: 9.3, trackingIDs: [101, 102] },
  },
  {
    id: 'CAM-MDP-02',
    name: 'Madanapalle RTC Bus Stand Circle',
    location: 'Sector 2 - Town Center, Madanapalle, AP',
    status: 'REC',
    fps: '30.0 FPS',
    resolution: '1080p FHD',
    aiStatus: 'HIGH THREAT DETECTED',
    aiStatusType: 'warning',
    severity: 7.4,
    lat: 13.6315,
    lng: 78.4820,
    videoUrl: '/assets/videos/weapon/weapon_001.mp4',
    detections: [
      { id: 1, type: 'person', label: 'Weapon Suspect (95%)', confidence: 0.95, x: 30, y: 25, w: 25, h: 55, color: '#f97316', trackId: 'TRK-201' }
    ],
    aiMetrics: { weapon: true, weaponConfidence: 95, fight: false, fightConfidence: 0, people: 5, blood: false, severity: 7.4, trackingIDs: [201] },
  },
  {
    id: 'CAM-MDP-03',
    name: 'Patel Road - Kadiri Junction',
    location: 'Sector 3 - Commerce Hub, Madanapalle, AP',
    status: 'REC',
    fps: '30.0 FPS',
    resolution: '1080p FHD',
    aiStatus: 'MONITORING',
    aiStatusType: 'info',
    severity: 5.2,
    lat: 13.6240,
    lng: 78.4680,
    videoUrl: '/assets/videos/fire/fire_001.mp4',
    detections: [
      { id: 1, type: 'fire', label: 'Smoke Hazard (88%)', confidence: 0.88, x: 45, y: 15, w: 30, h: 40, color: '#eab308', trackId: 'TRK-301' }
    ],
    aiMetrics: { weapon: false, weaponConfidence: 0, fight: false, fightConfidence: 0, people: 2, blood: false, severity: 5.2, trackingIDs: [301] },
  },
  {
    id: 'CAM-MDP-04',
    name: 'Angallu Highway Checkpost NH-71',
    location: 'Sector 4 - Highway Bypass, Madanapalle, AP',
    status: 'REC',
    fps: '30.0 FPS',
    resolution: '1080p FHD',
    aiStatus: 'HIGH THREAT DETECTED',
    aiStatusType: 'warning',
    severity: 7.8,
    lat: 13.6350,
    lng: 78.4910,
    videoUrl: '/assets/videos/accident/accident_003.mp4',
    detections: [
      { id: 1, type: 'car', label: 'Vehicle Overturn (91%)', confidence: 0.91, x: 25, y: 30, w: 45, h: 40, color: '#ef4444', trackId: 'TRK-401' }
    ],
    aiMetrics: { weapon: false, weaponConfidence: 0, fight: false, fightConfidence: 0, people: 4, blood: false, severity: 7.8, trackingIDs: [401] },
  }
];

function transformBackendToCamera(backend: BackendCamera): CameraData {
  const riskLevel = backend.risk_level;
  let aiStatus = 'AI_ACTIVE';
  let aiStatusType: 'danger' | 'warning' | 'info' | 'success' = 'success';
  let severity = 1.0;

  if (riskLevel === 'CRITICAL') {
    aiStatus = 'CRITICAL AI ALERT';
    aiStatusType = 'danger';
    severity = 9.0;
  } else if (riskLevel === 'HIGH') {
    aiStatus = 'HIGH THREAT DETECTED';
    aiStatusType = 'warning';
    severity = 7.0;
  } else if (riskLevel === 'MEDIUM') {
    aiStatus = 'MONITORING';
    aiStatusType = 'info';
    severity = 5.0;
  } else {
    aiStatus = 'NORMAL';
    aiStatusType = 'success';
    severity = 3.0;
  }

  return {
    id: backend.camera_id,
    name: backend.camera_name,
    location: `${backend.zone} - ${backend.city}, ${backend.state}`,
    status: backend.status === 'ONLINE' ? 'REC' : 'OFFLINE',
    fps: '30.0 FPS',
    resolution: '1080p FHD',
    aiStatus,
    aiStatusType,
    severity,
    lat: backend.latitude || 13.6288,
    lng: backend.longitude || 78.4746,
    videoUrl: backend.video_source || '/assets/videos/accident/accident_001.mp4',
    detections: [],
    aiMetrics: {
      weapon: false,
      weaponConfidence: 0,
      fight: false,
      fightConfidence: 0,
      people: 1,
      blood: false,
      severity,
      trackingIDs: [],
    },
  };
}

class AuthService {
  private token: string | null = null;
  private user: any = null;

  setToken(token: string, user: any) {
    this.token = token;
    this.user = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  getUser(): any {
    if (!this.user) {
      const userStr = localStorage.getItem('auth_user');
      this.user = userStr ? JSON.parse(userStr) : null;
    }
    return this.user;
  }

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();

class DataService {
  private cameras: CameraData[] = defaultCamerasList;
  private listeners: Array<() => void> = [];
  private isLoading = false;

  constructor() {
    this.loadCameras();
  }

  public async loadCameras() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const response = await safeFetch('/api/cameras');
      if (response && response.ok) {
        const backendCameras: BackendCamera[] = await response.json();
        if (backendCameras && backendCameras.length > 0) {
          this.cameras = backendCameras.map(transformBackendToCamera);
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.warn('Backend API /api/cameras offline — using Madanapalle default cameras', error);
    } finally {
      this.isLoading = false;
    }
  }

  public addCamera(newCam: CameraData) {
    this.cameras = [newCam, ...this.cameras];
    this.notifyListeners();
  }

  public refreshCameras() {
    this.loadCameras();
  }

  public getCameras(): CameraData[] {
    return this.cameras;
  }

  public getCameraById(id: string): CameraData | undefined {
    return this.cameras.find((c) => c.id === id);
  }

  public updateDetectionOverlay(cameraId: string, newOverlay: any, newMetrics?: any) {
    const camIndex = this.cameras.findIndex((c) => c.id === cameraId);
    if (camIndex !== -1) {
      this.cameras[camIndex].detections = newOverlay;
      if (newMetrics) {
        this.cameras[camIndex].aiMetrics = newMetrics;
      }
      this.notifyListeners();
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l());
  }
}

export const dataService = new DataService();
