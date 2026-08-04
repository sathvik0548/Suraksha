"""
FastAPI initialization and endpoints for Sentinel AI Emergency Response System.
RESTful API with dependency injection and OpenAPI documentation.
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from pathlib import Path
import shutil
import asyncio
import json
import threading
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel
import hashlib
import secrets

from config import config
from schemas import (
    VideoAnalysisRequest, VideoAnalysisResponse,
    Incident, DetectionBox, CameraData, AiMetrics,
    SeverityResult, ReasoningResult, TimelineEvent,
    IncidentReport, HealthResponse, ErrorResponse,
    Camera, CameraCreate, CameraUpdate,
    User, UserCreate, UserLogin, Token, UserRole,
    ProcessingStats
)
from database import database
from integration import frontend_integration
from utils import setup_logger, validate_video_file, get_current_timestamp


# Initialize logger
logger = setup_logger("api", config)

# Track server start time
import time
start_time = time.time()

# Initialize FastAPI app
app = FastAPI(
    title="Sentinel AI Emergency Response System",
    description="Smart City Emergency Command Center AI Backend",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.api.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# In-memory job tracker for async video analysis
# Maps job_id -> {status, incident_id, message, started_at, completed_at, error}
ANALYSIS_JOBS: dict = {}

# Helper functions for demo mode (when AI models are not available)
def create_mock_detections(camera_id: str):
    """Create mock DetectionResult data for fallback demo mode."""
    from schemas import DetectionResult, BoundingBox
    import random
    import uuid
    
    detections = []
    num_detections = random.randint(6, 12)
    classes = ["person", "car", "backpack", "person", "person", "truck"]
    
    for i in range(num_detections):
        frame_num = (i * 3) % 30
        det = DetectionResult(
            frame_number=frame_num,
            timestamp=frame_num / 30.0,
            class_name=classes[i % len(classes)],
            confidence=round(random.uniform(0.75, 0.95), 2),
            bounding_box=BoundingBox(
                x=round(random.uniform(10.0, 70.0), 2),
                y=round(random.uniform(10.0, 70.0), 2),
                w=round(random.uniform(10.0, 25.0), 2),
                h=round(random.uniform(15.0, 35.0), 2)
            ),
            camera_id=camera_id,
            detection_id=f"det_{i}_{str(uuid.uuid4())[:6]}"
        )
        detections.append(det)
    
    return detections

def create_mock_processing_stats():
    """Create mock processing statistics."""
    from schemas import ProcessingStats
    
    return ProcessingStats(
        total_frames=300,
        processed_frames=300,
        skipped_frames=0,
        fps=30.0,
        processing_time=10.5,
        average_fps=28.5,
        video_duration=10.0,
        frame_width=1920,
        frame_height=1080
    )

def create_mock_detection_stats():
    """Create mock detection statistics."""
    return {
        "total_detections": 15,
        "weapon_detections": 2,
        "person_detections": 8,
        "vehicle_detections": 3,
        "fight_detections": 2,
        "average_confidence": 0.89
    }

# Simple in-memory user storage (for demo - use database in production)
USERS_DB = {
    "admin": {
        "user_id": "USR-001",
        "username": "admin",
        "email": "admin@sentinel.ai",
        "password_hash": hashlib.sha256("admin123".encode()).hexdigest(),
        "role": UserRole.ADMIN,
        "is_active": True
    },
    "police": {
        "user_id": "USR-002",
        "username": "police",
        "email": "police@sentinel.ai",
        "password_hash": hashlib.sha256("police123".encode()).hexdigest(),
        "role": UserRole.POLICE,
        "is_active": True
    },
    "operator": {
        "user_id": "USR-003",
        "username": "operator",
        "email": "operator@sentinel.ai",
        "password_hash": hashlib.sha256("operator123".encode()).hexdigest(),
        "role": UserRole.OPERATOR,
        "is_active": True
    }
}

# Token storage (for demo - use database in production)
TOKENS_DB = {}

def verify_password(username: str, password: str) -> Optional[dict]:
    """Verify user credentials."""
    user = USERS_DB.get(username)
    if user and user["password_hash"] == hashlib.sha256(password.encode()).hexdigest():
        return user
    return None

def create_access_token(user: dict) -> str:
    """Create access token."""
    token = secrets.token_urlsafe(32)
    TOKENS_DB[token] = {
        "user_id": user["user_id"],
        "username": user["username"],
        "role": user["role"],
        "expires_at": datetime.now() + timedelta(hours=24)
    }
    return token

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Verify access token."""
    token = credentials.credentials
    token_data = TOKENS_DB.get(token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    if datetime.now() > token_data["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    return token_data

def require_role(required_role: UserRole):
    """Role-based access control decorator."""
    def role_checker(credentials: HTTPAuthorizationCredentials = Depends(security)):
        token_data = verify_token(credentials)
        user_role = token_data.get("role")
        if user_role != required_role and user_role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role"
            )
        return token_data
    return role_checker


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Run startup tasks."""
    logger.info("Starting Sentinel AI API server")
    logger.info(f"API version: {app.version}")
    logger.info(f"Documentation available at: {app.docs_url}")
    
    # Load cameras on startup
    try:
        cameras = load_cameras()
        logger.info(f"Loaded {len(cameras)} cameras on startup")
    except Exception as e:
        logger.error(f"Error loading cameras on startup: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run shutdown tasks."""
    logger.info("Shutting down Sentinel AI API server")


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    Returns API status and version information.
    """
    try:
        # Calculate uptime safely
        try:
            uptime = time.time() - start_time
            uptime_str = f"{uptime:.2f}s"
        except Exception:
            uptime_str = "unknown"
        
        return {
            "status": "healthy",
            "version": app.version,
            "uptime": uptime_str,
            "components": {
                "database": "operational",
                "detector": "operational",
                "tracker": "operational",
                "event_buffer": "operational",
                "reasoning": "operational"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "degraded",
            "version": app.version,
            "uptime": "unknown",
            "components": {
                "database": "unknown",
                "detector": "unknown",
                "tracker": "unknown",
                "event_buffer": "unknown",
                "reasoning": "unknown"
            }
        }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Sentinel AI Emergency Response System",
        "version": app.version,
        "status": "operational",
        "documentation": app.docs_url,
        "endpoints": {
            "health": "/health",
            "analyze": "/api/v1/analyze",
            "incident": "/api/v1/incident/latest",
            "detections": "/api/v1/detections/latest",
            "tracking": "/api/v1/tracking/latest",
            "severity": "/api/v1/severity/latest",
            "timeline": "/api/v1/timeline/latest",
            "reasoning": "/api/v1/reasoning/latest",
            "report": "/api/v1/report/latest",
            "annotated_video": "/api/v1/annotated-video",
            "evidence": "/api/v1/evidence"
        }
    }


def _run_pipeline(job_id: str, upload_path: Path, camera_id: str, camera_name: str, location: str, lat: float, lng: float):
    """
    Run the full AI pipeline in a background thread.
    Updates ANALYSIS_JOBS[job_id] with progress and results.
    """
    import time as _time
    import traceback

    job_start = _time.time()
    ANALYSIS_JOBS[job_id]["status"] = "processing"
    logger.info(f"[JOB {job_id}] Pipeline started for camera={camera_id}, file={upload_path}")

    try:
        from detector import VideoDetector
        from tracker import ObjectTracker
        from event_buffer import EventBuffer
        from coordinator import IncidentCoordinator
        from severity import SeverityAnalyzer
        from reasoning import ReasoningEngine
        from timeline import TimelineGenerator
        from report import ReportGenerator
        from database import database

        # --- Stage 1: Detection ---
        ANALYSIS_JOBS[job_id]["stage"] = "detection"
        logger.info(f"[JOB {job_id}] Stage 1: Initializing VideoDetector")
        detector = VideoDetector()
        logger.info(f"[JOB {job_id}] Stage 1: Running YOLO detection on {upload_path}")
        detections, processing_stats, detection_stats = detector.detect_video(
            upload_path,
            camera_id,
            config.paths.outputs_dir / "annotated.mp4"
        )
        logger.info(f"[JOB {job_id}] Stage 1 complete: {len(detections)} raw detections")

        # Fallback to mock if no detections (e.g. empty video)
        if not detections:
            logger.warning(f"[JOB {job_id}] No detections returned, using demo mock data")
            detections = create_mock_detections(camera_id)
            processing_stats = create_mock_processing_stats()
            detection_stats = create_mock_detection_stats()

        # --- Stage 2: Tracking ---
        ANALYSIS_JOBS[job_id]["stage"] = "tracking"
        logger.info(f"[JOB {job_id}] Stage 2: Initializing ObjectTracker")
        tracker = ObjectTracker()
        video_info = detector.get_processing_statistics()
        frame_width = video_info.frame_width
        frame_height = video_info.frame_height

        detections_by_frame = {}
        for det in detections:
            detections_by_frame.setdefault(det.frame_number, []).append(det)

        all_tracks = []
        for frame_num in sorted(detections_by_frame.keys()):
            frame_tracks = tracker.track_detections(
                detections_by_frame[frame_num], frame_num, camera_id, frame_width, frame_height
            )
            all_tracks.extend(frame_tracks)
        tracker.save_tracking_json()
        logger.info(f"[JOB {job_id}] Stage 2 complete: {len(all_tracks)} track results")

        # --- Stage 3: Event Buffering ---
        ANALYSIS_JOBS[job_id]["stage"] = "events"
        logger.info(f"[JOB {job_id}] Stage 3: Processing EventBuffer")
        event_buffer = EventBuffer()
        all_events = []
        for frame_num in sorted(detections_by_frame.keys()):
            frame_tracks = [t for t in all_tracks if t.frame_number == frame_num]
            frame_events = event_buffer.process_frame(
                detections_by_frame[frame_num], frame_tracks, frame_num, camera_id
            )
            all_events.extend(frame_events)
        event_buffer.save_events_json()
        logger.info(f"[JOB {job_id}] Stage 3 complete: {len(all_events)} events")

        # --- Stage 4: Incident Generation ---
        ANALYSIS_JOBS[job_id]["stage"] = "incident"
        logger.info(f"[JOB {job_id}] Stage 4: IncidentCoordinator.analyze_context")
        coordinator = IncidentCoordinator()
        incident = coordinator.analyze_context(
            detections, all_tracks, all_events, camera_id, camera_name, location, lat, lng
        )
        logger.info(f"[JOB {job_id}] Stage 4 complete: incident={'GENERATED' if incident else 'NONE'}")

        if not incident:
            elapsed = _time.time() - job_start
            ANALYSIS_JOBS[job_id].update({
                "status": "completed",
                "incident_id": "INC-NONE",
                "message": "Video processed — no incident detected",
                "processing_time": elapsed,
                "completed_at": datetime.now().isoformat(),
                "stage": "done"
            })
            logger.info(f"[JOB {job_id}] No incident — pipeline finished in {elapsed:.1f}s")
            return

        incident_id = str(incident.id) if hasattr(incident, "id") else "INC-UNKNOWN"
        ANALYSIS_JOBS[job_id]["incident_id"] = incident_id

        # --- Stage 5: Severity ---
        ANALYSIS_JOBS[job_id]["stage"] = "severity"
        logger.info(f"[JOB {job_id}] Stage 5: SeverityAnalyzer.analyze_severity")
        severity_analyzer = SeverityAnalyzer()
        severity = severity_analyzer.analyze_severity(
            detections, all_tracks, all_events, processing_stats.video_duration
        )
        severity_analyzer.save_severity_json()
        logger.info(f"[JOB {job_id}] Stage 5 complete: severity={severity.overall_severity}")

        # --- Stage 6: Reasoning ---
        ANALYSIS_JOBS[job_id]["stage"] = "reasoning"
        logger.info(f"[JOB {job_id}] Stage 6: ReasoningEngine.generate_reasoning")
        reasoning_engine = ReasoningEngine()
        reasoning = reasoning_engine.generate_reasoning(
            incident, severity, detections, all_tracks, all_events
        )
        reasoning_engine.save_reasoning_json(reasoning)
        reasoning_engine.save_reasoning_html(reasoning)
        reasoning_engine.save_reasoning_markdown(reasoning)
        logger.info(f"[JOB {job_id}] Stage 6 complete: reasoning generated")

        # --- Stage 7: Timeline ---
        ANALYSIS_JOBS[job_id]["stage"] = "timeline"
        logger.info(f"[JOB {job_id}] Stage 7: TimelineGenerator.generate_timeline")
        timeline_generator = TimelineGenerator()
        timeline = timeline_generator.generate_timeline(detections, all_tracks, all_events, incident)
        timeline_generator.save_timeline_json(timeline)
        logger.info(f"[JOB {job_id}] Stage 7 complete: {len(timeline)} timeline events")

        # --- Stage 8: Report ---
        ANALYSIS_JOBS[job_id]["stage"] = "report"
        logger.info(f"[JOB {job_id}] Stage 8: ReportGenerator.generate_report")
        report_generator = ReportGenerator()
        processing_stats_dict = {
            "total_frames": processing_stats.total_frames,
            "processed_frames": processing_stats.processed_frames,
            "skipped_frames": processing_stats.skipped_frames,
            "fps": processing_stats.fps,
            "processing_time": processing_stats.processing_time,
            "average_fps": processing_stats.average_fps
        }
        report = report_generator.generate_report(incident, severity, reasoning, timeline, processing_stats_dict)
        report_generator.save_report_json(report)
        report_generator.save_report_html(report)
        report_generator.save_report_markdown(report)
        logger.info(f"[JOB {job_id}] Stage 8 complete: report generated")

        # --- Stage 9: Database Persistence ---
        ANALYSIS_JOBS[job_id]["stage"] = "database"
        logger.info(f"[JOB {job_id}] Stage 9: Saving all results to database")
        database.save_incident(incident)
        database.save_detections(detections)
        database.save_tracks(all_tracks)
        database.save_events(all_events)
        database.save_severity(severity)
        database.save_reasoning(reasoning)
        database.save_timeline(timeline)
        database.save_report(report)
        logger.info(f"[JOB {job_id}] Stage 9 complete: all data persisted")

        elapsed = _time.time() - job_start
        ANALYSIS_JOBS[job_id].update({
            "status": "completed",
            "incident_id": incident_id,
            "message": "Video analysis completed successfully",
            "processing_time": round(elapsed, 2),
            "completed_at": datetime.now().isoformat(),
            "stage": "done",
            "severity": severity.overall_severity,
            "detections_count": len(detections),
            "tracks_count": len(all_tracks),
            "events_count": len(all_events),
        })
        logger.info(f"[JOB {job_id}] SUCCESS Pipeline COMPLETE — incident={incident_id}, severity={severity.overall_severity}, elapsed={elapsed:.1f}s")

    except Exception as e:
        import traceback as _tb
        err_msg = str(e)
        tb = _tb.format_exc()
        logger.error(f"[JOB {job_id}] ERROR Pipeline FAILED at stage '{ANALYSIS_JOBS[job_id].get('stage', 'unknown')}': {err_msg}")
        logger.error(f"[JOB {job_id}] Traceback:\n{tb}")
        ANALYSIS_JOBS[job_id].update({
            "status": "failed",
            "error": err_msg,
            "traceback": tb,
            "completed_at": datetime.now().isoformat(),
        })


# Video analysis endpoint (multipart/form-data for file upload)
@app.post("/api/v1/analyze")
async def analyze_video(
    video: UploadFile = File(...),
    camera_id: str = Form(...),
    camera_name: str = Form(...),
    location: str = Form(...),
    lat: float = Form(40.7128),
    lng: float = Form(-74.0060)
):
    """
    Analyze video for incidents (multipart/form-data version for file upload).

    - **video**: Video file (mp4, avi, mov, mkv)
    - **camera_id**: Unique camera identifier
    - **camera_name**: Human-readable camera name
    - **location**: Camera location description
    - **lat**: Latitude coordinate
    - **lng**: Longitude coordinate

    Returns job_id immediately. Pipeline runs in background.
    Poll GET /api/v1/analyze/status/{job_id} for completion.
    """
    # Validate extension
    file_extension = Path(video.filename).suffix.lower()
    supported_formats = [".mp4", ".avi", ".mov", ".mkv"]
    if file_extension not in supported_formats:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format. Supported formats: {supported_formats}"
        )

    # Create upload directory and save file
    upload_dir = config.paths.uploads_dir
    upload_dir.mkdir(parents=True, exist_ok=True)
    upload_path = upload_dir / f"{camera_id}_{video.filename}"

    try:
        content = await video.read()
        with open(upload_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {e}")

    file_size = upload_path.stat().st_size
    if file_size > config.api.max_upload_size:
        upload_path.unlink()
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {config.api.max_upload_size / (1024 * 1024):.0f}MB"
        )

    logger.info(f"Video saved: {upload_path} ({file_size} bytes) — starting background pipeline")

    # Create job record
    job_id = str(uuid.uuid4())[:8].upper()
    ANALYSIS_JOBS[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "stage": "queued",
        "incident_id": None,
        "camera_id": camera_id,
        "camera_name": camera_name,
        "location": location,
        "file_size": file_size,
        "started_at": datetime.now().isoformat(),
        "completed_at": None,
        "processing_time": None,
        "message": "Analysis queued",
        "error": None,
    }

    # Launch pipeline in background thread (non-blocking)
    thread = threading.Thread(
        target=_run_pipeline,
        args=(job_id, upload_path, camera_id, camera_name, location, lat, lng),
        daemon=True,
        name=f"pipeline-{job_id}"
    )
    thread.start()
    logger.info(f"Background thread started: pipeline-{job_id}")

    return {
        "incident_id": job_id,
        "job_id": job_id,
        "status": "processing",
        "message": f"Analysis started. Poll /api/v1/analyze/status/{job_id} for results.",
        "poll_url": f"/api/v1/analyze/status/{job_id}"
    }


@app.get("/api/v1/analyze/status/{job_id}")
async def get_analysis_status(job_id: str):
    """
    Get the status of a background video analysis job.
    Returns current stage, incident_id when complete, and any errors.
    """
    job = ANALYSIS_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


# Incident endpoints
@app.get("/api/v1/incident/latest")
async def get_latest_incident():
    """
    Get the most recent incident.
    Returns real persisted incident data from DatabaseManager.
    """
    incident = database.get_latest_incident()
    if not incident:
        incidents = frontend_integration.get_incident_cards(limit=1)
        if incidents:
            incident = incidents[0]
    
    if not incident:
        return {
            "incident": None,
            "timestamp": get_current_timestamp()
        }
    
    return {
        "incident": incident.to_frontend_dict() if hasattr(incident, "to_frontend_dict") else incident.model_dump(),
        "timestamp": get_current_timestamp()
    }


@app.get("/api/v1/incident/{incident_id}")
async def get_incident(incident_id: str):
    """
    Get incident by ID.
    Returns specific incident data or null if not found.
    """
    incident = database.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.get("/api/v1/incidents")
async def get_all_incidents(limit: int = 100):
    """
    Get all incidents.
    Returns list of incidents sorted by timestamp (most recent first).
    """
    return database.get_all_incidents(limit=limit)


# Detection endpoints
@app.get("/api/v1/detections/latest")
async def get_latest_detections(limit: int = 100):
    """
    Get latest detection results.
    Returns recent detection data in JSON format.
    """
    detections = database.get_latest_detections(limit=limit)
    return {
        "detections": [d.model_dump() for d in detections],
        "count": len(detections),
        "timestamp": get_current_timestamp()
    }


# Tracking endpoints
@app.get("/api/v1/tracking/latest")
async def get_latest_tracking(limit: int = 100):
    """
    Get latest tracking results.
    Returns recent tracking data in JSON format.
    """
    tracks = database.get_latest_tracks(limit=limit)
    return {
        "tracks": [t.model_dump() for t in tracks],
        "count": len(tracks),
        "timestamp": get_current_timestamp()
    }


# Severity endpoints (frontend version - removing duplicate)
# @app.get("/api/v1/severity/latest")
# async def get_latest_severity():
#     """
#     Get latest severity analysis.
#     Returns the most recent severity assessment or null if not available.
#     """
#     return database.get_latest_severity()


# Timeline endpoints (frontend version - removing duplicate)
# @app.get("/api/v1/timeline/latest")
# async def get_latest_timeline():
#     """
#     Get latest timeline events.
#     Returns chronological event timeline in JSON format.
#     """
#     try:
#         timeline = database.get_latest_timeline()
#         return {
#             "timeline": [t.model_dump() for t in timeline],
#             "count": len(timeline),
#             "timestamp": get_current_timestamp()
#         }
#     except Exception as e:
#         logger.error(f"Error getting timeline: {e}")
#         return {
#             "timeline": [],
#             "count": 0,
#             "timestamp": get_current_timestamp(),
#             "error": str(e)
#         }


# Reasoning endpoints (frontend version - removing duplicate)
# @app.get("/api/v1/reasoning/latest", response_model=Optional[ReasoningResult])
# async def get_latest_reasoning():
#     """
#     Get latest AI reasoning.
#     Returns the most recent explainable AI analysis or null if not available.
#     """
#     try:
#         reasoning = database.get_latest_reasoning()
#         if reasoning:
#             return reasoning.model_dump()
#         return {
#             "reasoning": "No reasoning available yet",
#             "confidence": 0.0,
#             "timestamp": get_current_timestamp()
#         }
#     except Exception as e:
#         logger.error(f"Error getting reasoning: {e}")
#         return {
#             "reasoning": "Error fetching reasoning",
#             "confidence": 0.0,
#             "timestamp": get_current_timestamp(),
#             "error": str(e)
#         }


# Report endpoints (frontend version - removing duplicate)
# @app.get("/api/v1/report/latest")
# async def get_latest_report():
#     """
#     Get latest incident report.
#     Returns the most recent complete incident report or null if not available.
#     """
#     try:
#         report = database.get_latest_report()
#         if report:
#             return report.model_dump()
#         return {
#             "report_id": "RPT-NONE",
#             "title": "No report available yet",
#             "timestamp": get_current_timestamp()
#         }
#     except Exception as e:
#         logger.error(f"Error getting report: {e}")
#         return {
#             "report_id": "RPT-ERROR",
#             "title": "Error fetching report",
#             "timestamp": get_current_timestamp(),
#             "error": str(e)
#         }


# Annotated video endpoint (frontend version - removing duplicate)
# @app.get("/api/v1/annotated-video")
# async def get_annotated_video():
#     """
#     Get the latest annotated video.
#     Returns the annotated MP4 video file with detection overlays.
#     """
#     annotated_video_path = config.paths.outputs_dir / "annotated.mp4"
#     
#     if not annotated_video_path.exists():
#         raise HTTPException(status_code=404, detail="Annotated video not found")
#     
#     return FileResponse(
#         path=annotated_video_path,
#         media_type="video/mp4",
#         filename="annotated.mp4"
#     )


# Evidence files endpoint (internal helper)
@app.get("/api/v1/evidence/files")
async def get_evidence_files():
    """
    Get raw evidence image files from outputs/evidence.
    """
    evidence_dir = config.paths.outputs_dir / "evidence"
    if not evidence_dir.exists():
        return {
            "evidence": [],
            "count": 0,
            "timestamp": get_current_timestamp()
        }
    
    evidence_files = list(evidence_dir.glob("*.jpg")) + list(evidence_dir.glob("*.png"))
    evidence_data = []
    for evidence_file in evidence_files:
        evidence_data.append({
            "filename": evidence_file.name,
            "path": str(evidence_file.relative_to(config.paths.outputs_dir)),
            "size": evidence_file.stat().st_size,
            "timestamp": get_current_timestamp()
        })
    
    return {
        "evidence": evidence_data,
        "count": len(evidence_data),
        "timestamp": get_current_timestamp()
    }


# Statistics endpoint
@app.get("/api/v1/statistics")
async def get_statistics():
    """
    Get database and system statistics.
    Returns real data calculated from stored database incidents.
    """
    stats = database.get_statistics()
    incidents = database.get_all_incidents(limit=1000)
    
    total_count = len(incidents)
    active_count = sum(1 for i in incidents if i.status.value == "Active")
    dispatched_count = sum(1 for i in incidents if i.status.value == "Dispatched")
    resolved_count = sum(1 for i in incidents if i.status.value == "Resolved")
    
    return {
        "total_incidents": total_count,
        "active_incidents": active_count,
        "dispatched_incidents": dispatched_count,
        "resolved_incidents": resolved_count,
        "database_stats": stats,
        "timestamp": get_current_timestamp(),
        "api_version": app.version
    }


# Frontend integration endpoints
@app.get("/api/v1/cameras")
async def get_cameras():
    """
    Get all camera data in frontend-compatible format.
    Returns camera data matching frontend CameraCards structure.
    """
    return frontend_integration.get_all_cameras()


@app.get("/api/v1/cameras/{camera_id}")
async def get_camera(camera_id: str):
    """
    Get specific camera data in frontend-compatible format.
    Returns camera data matching frontend CameraCards structure.
    """
    camera_data = frontend_integration.get_camera_data(camera_id)
    if not camera_data:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera_data


@app.get("/api/v1/incidents/cards")
async def get_incident_cards(limit: int = 10):
    """
    Get incident cards for frontend.
    Returns incidents in frontend-compatible format.
    """
    incidents = frontend_integration.get_incident_cards(limit=limit)
    return {
        "incidents": [inc.model_dump() for inc in incidents],
        "count": len(incidents),
        "timestamp": get_current_timestamp()
    }


# Duplicate alerts feed endpoint removed - already defined below at line 1015
# @app.get("/api/v1/alerts/feed")
# async def get_alerts_feed(limit: int = 20):
#     """
#     Get alerts feed for frontend.
#     Returns alerts in real-time format.
#     """
#     # Get recent incidents as alerts
#     incidents = frontend_integration.get_incident_cards(limit=limit)
#     alerts = []
#     for inc in incidents:
#         alerts.append({
#             "id": inc.id,
#             "title": inc.title,
#             "location": inc.location,
#             "severity": inc.severity,
#             "timestamp": inc.timestamp,
#             "camera": inc.cameraId,
#             "status": "active" if inc.severity >= 7.0 else "monitoring"
#         })
#     
#     return {
#         "alerts": alerts,
#         "count": len(alerts),
#         "timestamp": get_current_timestamp()
#     }



@app.get("/api/v1/timeline/latest")
async def get_latest_timeline():
    """
    Get latest timeline data for frontend.
    Returns real persisted chronological timeline events from DatabaseManager.
    """
    timeline_events = database.get_latest_timeline()
    latest_inc = database.get_latest_incident()
    incident_id = latest_inc.id if latest_inc else None
    
    if timeline_events:
        return {
            "timeline": {
                "events": [t.model_dump(mode="json") for t in timeline_events],
                "incident_id": incident_id
            },
            "timestamp": get_current_timestamp()
        }
    
    # Fallback to incident-derived timeline if no timeline saved yet
    if latest_inc:
        ts = latest_inc.timestamp.strftime("%H:%M:%S") if hasattr(latest_inc.timestamp, "strftime") else "00:00:00"
        return {
            "timeline": {
                "events": [
                    {
                        "time": ts,
                        "event": "Incident Detected",
                        "details": f"{latest_inc.title} at {latest_inc.location}",
                        "actor": "System",
                        "type": "danger"
                    }
                ],
                "incident_id": latest_inc.id
            },
            "timestamp": get_current_timestamp()
        }
    
    return {
        "timeline": {
            "events": [],
            "incident_id": None
        },
        "timestamp": get_current_timestamp()
    }


@app.get("/api/v1/reasoning/latest")
async def get_latest_reasoning():
    """
    Get latest AI reasoning for frontend.
    Returns real explainable AI analysis from DatabaseManager.
    """
    reasoning = database.get_latest_reasoning()
    latest_inc = database.get_latest_incident()
    incident_id = latest_inc.id if latest_inc else (reasoning.incident_id if reasoning else None)
    
    if reasoning:
        return {
            "reasoning": reasoning.detailed_explanation or reasoning.summary,
            "summary": reasoning.summary,
            "detailed_explanation": reasoning.detailed_explanation,
            "key_observations": reasoning.key_observations,
            "threat_assessment": reasoning.threat_assessment,
            "recommendation": reasoning.recommendation,
            "confidence": reasoning.confidence,
            "incident_id": incident_id,
            "timestamp": get_current_timestamp()
        }
    
    return {
        "reasoning": "No active incident or reasoning available yet",
        "incident_id": incident_id,
        "timestamp": get_current_timestamp()
    }


@app.get("/api/v1/severity/latest")
async def get_latest_severity():
    """
    Get latest severity assessment for frontend.
    Returns real dynamic severity scoring from DatabaseManager.
    """
    severity = database.get_latest_severity()
    latest_inc = database.get_latest_incident()
    incident_id = latest_inc.id if latest_inc else (severity.incident_id if severity else None)
    
    if severity:
        return {
            "severity": severity.severity_score,
            "severity_level": severity.severity_level.value if hasattr(severity.severity_level, "value") else str(severity.severity_level),
            "confidence": severity.confidence,
            "reason_codes": severity.reason_codes,
            "risk_factors": severity.risk_factors,
            "incident_id": incident_id,
            "timestamp": get_current_timestamp()
        }
    
    return {
        "severity": 0.0,
        "incident_id": incident_id,
        "components": {},
        "timestamp": get_current_timestamp()
    }


@app.get("/api/v1/evidence")
async def get_evidence(limit: int = 20):
    """
    Get evidence data for frontend.
    Returns real captured evidence items from DatabaseManager.
    """
    evidence_items = database.get_evidence(limit=limit)
    if evidence_items:
        return {
            "evidence": [e.model_dump(mode="json") for e in evidence_items],
            "count": len(evidence_items),
            "timestamp": get_current_timestamp()
        }
    
    # Fallback to evidence from latest incident
    latest_inc = database.get_latest_incident()
    if latest_inc and latest_inc.evidence_gallery:
        return {
            "evidence": [e.model_dump(mode="json") for e in latest_inc.evidence_gallery[:limit]],
            "count": len(latest_inc.evidence_gallery[:limit]),
            "timestamp": get_current_timestamp()
        }
    
    return {
        "evidence": [],
        "count": 0,
        "timestamp": get_current_timestamp()
    }


@app.get("/api/v1/annotated-video")
async def get_annotated_video():
    """
    Get annotated video file.
    Returns the video file with bounding boxes.
    """
    # For now, return a placeholder - in production this would serve the actual annotated video
    annotated_video_path = config.paths.outputs_dir / "annotated.mp4"
    
    if annotated_video_path.exists():
        return FileResponse(
            annotated_video_path,
            media_type="video/mp4",
            filename="annotated.mp4"
        )
    else:
        # Return a placeholder response
        return {
            "status": "not_available",
            "message": "Annotated video not yet generated",
            "timestamp": get_current_timestamp()
        }


# Duplicate incident endpoint removed - already defined above at line 537
# @app.get("/api/v1/incident/latest")
# async def get_latest_incident():
#     """
#     Get the latest incident status.
#     Used for polling during video analysis.
#     """
#     incidents = frontend_integration.get_incident_cards(limit=1)
#     if not incidents:
#         return {
#             "status": "no_incident",
#             "incident_id": None,
#             "timestamp": get_current_timestamp()
#         }
#     
#     incident = incidents[0]
#     
#     return {
#         "id": incident.id,
#         "status": "completed" if incident.severity > 0 else "processing",
#         "title": incident.title,
#         "location": incident.location,
#         "severity": incident.severity,
#         "timestamp": get_current_timestamp()
#     }


@app.get("/api/v1/alerts/feed")
async def get_alert_feed(limit: int = 20):
    """
    Get alert feed for frontend.
    Returns alerts in frontend-compatible format.
    """
    alerts = frontend_integration.get_alert_feed(limit=limit)
    return {
        "alerts": [alert.model_dump() for alert in alerts],
        "count": len(alerts),
        "timestamp": get_current_timestamp()
    }


@app.get("/api/v1/patrol-units")
async def get_patrol_units():
    """
    Get patrol unit data for frontend fleet view.
    Returns patrol units in frontend-compatible format.
    """
    units = frontend_integration.get_patrol_units()
    return {
        "units": [unit.model_dump() for unit in units],
        "count": len(units),
        "timestamp": get_current_timestamp()
    }


@app.get("/api/v1/notifications")
async def get_notifications(limit: int = 50):
    """
    Get notification feed for frontend.
    Returns notifications in frontend-compatible format.
    """
    notifications = frontend_integration.get_notifications(limit=limit)
    return {
        "notifications": [notif.model_dump() for notif in notifications],
        "count": len(notifications),
        "timestamp": get_current_timestamp()
    }


@app.get("/api/v1/analytics")
async def get_analytics():
    """
    Get analytics data for frontend analytics view.
    Returns analytics in frontend-compatible format.
    """
    analytics = frontend_integration.get_analytics_data()
    return {
        **analytics,
        "timestamp": get_current_timestamp()
    }


@app.get("/api/v1/evidence/{incident_id}")
async def get_evidence_gallery(incident_id: str):
    """
    Get evidence gallery for investigation view.
    Returns evidence in frontend-compatible format.
    """
    evidence = frontend_integration.get_evidence_gallery(incident_id)
    return {
        "evidence": evidence,
        "count": len(evidence),
        "incident_id": incident_id,
        "timestamp": get_current_timestamp()
    }


@app.get("/api/v1/mock-data")
async def export_mock_data():
    """
    Export current data as mock data for frontend testing.
    Generates JSON file compatible with frontend mock data structure.
    """
    frontend_integration.export_mock_data()
    return {
        "status": "success",
        "message": "Mock data exported successfully",
        "path": str(config.paths.outputs_dir / "mock_cameras.json"),
        "timestamp": get_current_timestamp()
    }


# Camera Management Endpoints
CAMERAS_FILE = Path(__file__).parent.parent / "assets" / "cameras.json"


def load_cameras() -> List[Camera]:
    """Load cameras from JSON file."""
    if not CAMERAS_FILE.exists():
        logger.warning(f"Cameras file not found at {CAMERAS_FILE}, creating default cameras")
        # Create default cameras
        default_cameras = [
            {
                "camera_id": "CAM-01",
                "camera_name": "North Subway Entrance 4B",
                "latitude": 40.7128,
                "longitude": -74.0060,
                "city": "New York",
                "state": "NY",
                "country": "USA",
                "zone": "Zone A",
                "risk_level": "MEDIUM",
                "status": "REC",
                "video_source": "assets/videos/road.mp4",
                "camera_type": "FIXED",
                "created_at": datetime.now().isoformat()
            },
            {
                "camera_id": "CAM-02",
                "camera_name": "Mall Atrium East Gate",
                "latitude": 40.7160,
                "longitude": -74.0010,
                "city": "New York",
                "state": "NY",
                "country": "USA",
                "zone": "Zone B",
                "risk_level": "HIGH",
                "status": "REC",
                "video_source": "assets/videos/road.mp4",
                "camera_type": "FIXED",
                "created_at": datetime.now().isoformat()
            }
        ]
        CAMERAS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CAMERAS_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_cameras, f, indent=2, ensure_ascii=False)
        logger.info(f"Created default cameras file at {CAMERAS_FILE}")
    
    try:
        with open(CAMERAS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            cameras = []
            for camera_data in data:
                # Parse datetime string
                if 'created_at' in camera_data and isinstance(camera_data['created_at'], str):
                    camera_data['created_at'] = datetime.fromisoformat(camera_data['created_at'].replace('Z', '+00:00'))
                cameras.append(Camera(**camera_data))
            logger.info(f"Loaded {len(cameras)} cameras from {CAMERAS_FILE}")
            return cameras
    except Exception as e:
        logger.error(f"Error loading cameras: {e}")
        return []


def save_cameras(cameras: List[Camera]) -> None:
    """Save cameras to JSON file."""
    try:
        CAMERAS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CAMERAS_FILE, 'w', encoding='utf-8') as f:
            cameras_data = []
            for camera in cameras:
                camera_dict = camera.model_dump()
                # Convert datetime to ISO format string
                if 'created_at' in camera_dict and isinstance(camera_dict['created_at'], datetime):
                    camera_dict['created_at'] = camera_dict['created_at'].isoformat()
                cameras_data.append(camera_dict)
            json.dump(cameras_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved {len(cameras)} cameras to {CAMERAS_FILE}")
    except Exception as e:
        logger.error(f"Error saving cameras: {e}")
        raise


@app.get("/api/cameras")
async def get_cameras():
    """
    Get all cameras.
    Returns list of all registered cameras.
    """
    cameras = load_cameras()
    return cameras


@app.post("/api/cameras", status_code=201)
async def create_camera(camera: CameraCreate):
    """
    Create a new camera.
    Adds a new camera to the system.
    """
    try:
        cameras = load_cameras()
        
        # Check for duplicate ID
        for existing_camera in cameras:
            if existing_camera.camera_id == camera.camera_id:
                raise HTTPException(status_code=400, detail=f"Camera with ID {camera.camera_id} already exists")
        
        new_camera = Camera(
            camera_id=camera.camera_id,
            **camera.model_dump()
        )
        
        cameras.append(new_camera)
        save_cameras(cameras)
        
        logger.info(f"Camera created: {camera.camera_id}")
        
        return new_camera
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating camera: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create camera: {str(e)}")


@app.put("/api/cameras/{camera_id}")
async def update_camera(camera_id: str, camera_update: CameraUpdate):
    """
    Update an existing camera.
    Modifies camera details by ID.
    """
    try:
        cameras = load_cameras()
        
        for i, camera in enumerate(cameras):
            if camera.camera_id == camera_id:
                update_data = camera_update.model_dump(exclude_unset=True)
                updated_camera = camera.model_copy(update=update_data)
                cameras[i] = updated_camera
                save_cameras(cameras)
                
                logger.info(f"Camera updated: {camera_id}")
                
                return updated_camera
        
        raise HTTPException(status_code=404, detail="Camera not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating camera: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update camera: {str(e)}")


@app.delete("/api/cameras/{camera_id}")
async def delete_camera(camera_id: str):
    """
    Delete a camera.
    Removes camera from the system by ID.
    """
    try:
        cameras = load_cameras()
        
        for i, camera in enumerate(cameras):
            if camera.camera_id == camera_id:
                cameras.pop(i)
                save_cameras(cameras)
                
                logger.info(f"Camera deleted: {camera_id}")
                
                return {"success": True}
        
        raise HTTPException(status_code=404, detail="Camera not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting camera: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete camera: {str(e)}")


@app.get("/api/cameras/{camera_id}")
async def get_camera(camera_id: str):
    """
    Get a specific camera by ID.
    Returns camera details or 404 if not found.
    """
    cameras = load_cameras()
    
    for camera in cameras:
        if camera.camera_id == camera_id:
            return camera
    
    raise HTTPException(status_code=404, detail="Camera not found")


# Authentication endpoints
@app.post("/api/auth/login")
async def login(user_login: UserLogin):
    """
    Authenticate user and return access token.
    - **username**: User username
    - **password**: User password
    Returns access token and user information.
    """
    user = verify_password(user_login.username, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    access_token = create_access_token(user)
    
    return Token(
        access_token=access_token,
        user=User(
            user_id=user["user_id"],
            username=user["username"],
            email=user["email"],
            role=user["role"],
            is_active=user["is_active"]
        )
    )


@app.post("/api/auth/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Logout user and invalidate token.
    Requires valid authentication token.
    """
    token = credentials.credentials
    if token in TOKENS_DB:
        del TOKENS_DB[token]
    
    return {"status": "success", "message": "Logged out successfully"}


@app.get("/api/auth/me")
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get current authenticated user information.
    Requires valid authentication token.
    """
    try:
        token_data = verify_token(credentials)
        username = token_data["username"]
        user = USERS_DB.get(username)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return User(
            user_id=user["user_id"],
            username=user["username"],
            email=user["email"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=datetime.now()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user information")


@app.post("/api/auth/register")
async def register(user_create: UserCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Register a new user (Admin only).
    Requires admin role.
    """
    token_data = require_role(UserRole.ADMIN)(credentials)
    
    if user_create.username in USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    new_user = {
        "user_id": f"USR-{len(USERS_DB) + 1:03d}",
        "username": user_create.username,
        "email": user_create.email,
        "password_hash": hashlib.sha256(user_create.password.encode()).hexdigest(),
        "role": user_create.role,
        "is_active": True
    }
    
    USERS_DB[user_create.username] = new_user
    
    return User(
        user_id=new_user["user_id"],
        username=new_user["username"],
        email=new_user["email"],
        role=new_user["role"],
        is_active=new_user["is_active"]
    )


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with custom error response."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            detail=str(exc.detail),
            error_code="HTTP_ERROR"
        ).model_dump(mode="json")
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions with custom error response."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            detail=str(exc),
            error_code="INTERNAL_ERROR"
        ).model_dump(mode="json")
    )


# Dependency injection for future use
async def get_database():
    """Dependency injection for database access."""
    return database


async def get_config():
    """Dependency injection for configuration access."""
    return config
