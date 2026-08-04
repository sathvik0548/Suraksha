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
    id: 'CAM-01',
    name: 'North Subway Entrance 4B',
    location: 'Sector 7G - New York, NY',
    status: 'REC',
    fps: '30.0 FPS',
    resolution: '1080p FHD',
    aiStatus: 'HIGH THREAT DETECTED',
    aiStatusType: 'warning',
    severity: 7.4,
    lat: 40.7128,
    lng: -74.006,
    videoUrl: '/assets/videos/accident/accident_001.mp4',
    detections: [],
    aiMetrics: { weapon: true, weaponConfidence: 88, fight: true, fightConfidence: 91, people: 4, blood: false, severity: 7.4, trackingIDs: [101, 102] },
  },
  {
    id: 'CAM-02',
    name: 'Mall Atrium East Gate',
    location: 'Sector 3A - New York, NY',
    status: 'REC',
    fps: '30.0 FPS',
    resolution: '1080p FHD',
    aiStatus: 'MONITORING',
    aiStatusType: 'info',
    severity: 5.0,
    lat: 40.716,
    lng: -74.001,
    videoUrl: '/assets/videos/crowd/crowded_001.mp4',
    detections: [],
    aiMetrics: { weapon: false, weaponConfidence: 0, fight: false, fightConfidence: 0, people: 12, blood: false, severity: 5.0, trackingIDs: [201, 202] },
  },
  {
    id: 'CAM-03',
    name: 'Highway Interchange Sector 12',
    location: 'Sector 12 - New York, NY',
    status: 'REC',
    fps: '30.0 FPS',
    resolution: '1080p FHD',
    aiStatus: 'NORMAL',
    aiStatusType: 'success',
    severity: 3.0,
    lat: 40.722,
    lng: -74.001,
    videoUrl: '/assets/videos/fire/fire_001.mp4',
    detections: [],
    aiMetrics: { weapon: false, weaponConfidence: 0, fight: false, fightConfidence: 0, people: 2, blood: false, severity: 3.0, trackingIDs: [] },
  },
  {
    id: 'CAM-04',
    name: 'Parking Structure P3 Level 2',
    location: 'Sector 5B - New York, NY',
    status: 'REC',
    fps: '30.0 FPS',
    resolution: '1080p FHD',
    aiStatus: 'CRITICAL AI ALERT',
    aiStatusType: 'danger',
    severity: 9.2,
    lat: 40.718,
    lng: -73.998,
    videoUrl: '/assets/videos/weapon/weapon_001.mp4',
    detections: [],
    aiMetrics: { weapon: true, weaponConfidence: 96, fight: true, fightConfidence: 89, people: 3, blood: false, severity: 9.2, trackingIDs: [301] },
  },
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
    lat: backend.latitude,
    lng: backend.longitude,
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
      console.warn('Backend API /api/cameras offline — using default cameras', error);
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
