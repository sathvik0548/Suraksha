# Sentinel AI - Brain Module

Production-grade AI backend for the Smart City Emergency Command Center.

## Architecture Overview

The brain module implements a clean architecture with SOLID principles, separating concerns into independent modules:

### Core Components

1. **Configuration (`config.py`)**
   - Centralized configuration management
   - Environment-based overrides
   - Separate configs for models, video, severity, events, API, database, logging, and annotation

2. **Schemas (`schemas.py`)**
   - Pydantic models for API validation
   - Data structures matching frontend interfaces
   - Request/response models for all endpoints

3. **Database (`database.py`)**
   - JSON-based storage with thread-safe operations
   - Retention policies and cleanup
   - Cache management for fast access

4. **Utilities (`utils.py`)**
   - Reusable helper functions
   - Video processing utilities
   - Math and statistical functions
   - File I/O operations

### AI Pipeline Components

5. **Detector (`detector.py`)**
   - YOLO11 object detection
   - Professional video annotation
   - Frame-by-frame processing
   - Detection statistics and JSON export

6. **Tracker (`tracker.py`)**
   - ByteTrack object tracking
   - Persistent track IDs across frames
   - Speed, direction, and trajectory calculation
   - Track history management

7. **Event Buffer (`event_buffer.py`)**
   - Continuous event generation
   - Cooldown management
   - Event classification and duration tracking
   - JSON export

8. **Coordinator (`coordinator.py`)**
   - Intelligence layer combining temporal data
   - Incident generation from context
   - Threat classification
   - Evidence aggregation

9. **Severity (`severity.py`)**
   - Dynamic severity scoring (1.0-10.0)
   - Multi-factor analysis
   - Evolving severity during incident
   - Trend tracking

10. **Reasoning (`reasoning.py`)**
    - Explainable AI with human-readable output
    - Multi-format export (JSON, HTML, Markdown)
    - Contextual recommendations
    - Confidence assessment

11. **Timeline (`timeline.py`)**
    - Chronological event reconstruction
    - Incident progression tracking
    - Timeline summary statistics

12. **Report (`report.py`)**
    - Comprehensive incident reports
    - Multi-format export (JSON, HTML, Markdown)
    - Executive summary generation
    - PDF-ready architecture

### API & Integration

13. **API (`api.py`)**
    - FastAPI REST endpoints
    - OpenAPI documentation
    - CORS configuration
    - Error handling
    - Video upload and processing pipeline

14. **Main (`main.py`)**
    - Server startup code
    - Configuration validation
    - Development/production modes

15. **Integration (`integration.py`)**
    - Frontend compatibility layer
    - Data transformation for React components
    - Mock data export
    - WebSocket-ready architecture

## Directory Structure

```
brain/
├── __init__.py              # Package initialization
├── main.py                  # Server startup
├── config.py                # Configuration classes
├── schemas.py               # Pydantic models
├── utils.py                 # Utility functions
├── database.py              # Database operations
├── api.py                   # FastAPI endpoints
├── detector.py              # Object detection
├── tracker.py               # Object tracking
├── event_buffer.py          # Event generation
├── coordinator.py           # Incident coordination
├── severity.py              # Severity analysis
├── reasoning.py             # Explainable AI
├── timeline.py              # Timeline generation
├── report.py                # Report generation
├── integration.py           # Frontend integration
├── requirements.txt         # Python dependencies
├── models/                  # Model storage
├── uploads/                 # Video uploads
├── outputs/                 # Analysis outputs
└── logs/                    # Log files
```

## Installation

1. Navigate to the brain directory:
```bash
cd brain
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Core Endpoints

- `POST /api/v1/analyze` - Upload and analyze video
- `GET /health` - Health check
- `GET /api/v1/incident/latest` - Latest incident
- `GET /api/v1/detections/latest` - Latest detections
- `GET /api/v1/tracking/latest` - Latest tracking data
- `GET /api/v1/severity/latest` - Latest severity analysis
- `GET /api/v1/timeline/latest` - Latest timeline
- `GET /api/v1/reasoning/latest` - Latest AI reasoning
- `GET /api/v1/report/latest` - Latest incident report
- `GET /api/v1/annotated-video` - Annotated video
- `GET /api/v1/evidence` - Evidence frames

### Frontend Integration Endpoints

- `GET /api/v1/cameras` - All camera data
- `GET /api/v1/cameras/{camera_id}` - Specific camera
- `GET /api/v1/incidents/cards` - Incident cards
- `GET /api/v1/alerts/feed` - Alert feed
- `GET /api/v1/patrol-units` - Patrol units
- `GET /api/v1/notifications` - Notifications
- `GET /api/v1/analytics` - Analytics data
- `GET /api/v1/evidence/{incident_id}` - Evidence gallery
- `GET /api/v1/mock-data` - Export mock data

## Processing Pipeline

1. **Video Upload** → Client uploads MP4 video
2. **Detection** → YOLO11 detects objects frame-by-frame
3. **Tracking** → ByteTrack assigns persistent IDs
4. **Event Buffer** → Continuous events are generated
5. **Coordination** → Incident context is analyzed
6. **Severity** → Dynamic severity is calculated
7. **Reasoning** → Explainable AI generates insights
8. **Timeline** → Chronological events are recorded
9. **Report** → Comprehensive report is generated
10. **Database** → All results are persisted

## Output Files

Analysis generates the following files in `brain/outputs/`:

- `annotated.mp4` - Video with detection overlays
- `detections.json` - Detection results with statistics
- `tracking.json` - Tracking results with trajectories
- `events.json` - Continuous event data
- `incident.json` - Generated incident object
- `severity.json` - Severity analysis with factors
- `reasoning.json` - AI reasoning (JSON)
- `reasoning.html` - AI reasoning (HTML)
- `reasoning.md` - AI reasoning (Markdown)
- `timeline.json` - Chronological timeline
- `report.json` - Complete incident report
- `report.html` - Incident report (HTML)
- `report.md` - Incident report (Markdown)

## Frontend Compatibility

The integration layer ensures all API responses match the frontend data structures:

- **Camera Cards** → `/api/v1/cameras`
- **Incident Cards** → `/api/v1/incidents/cards`
- **Bounding Boxes** → Included in camera data
- **Evidence Gallery** → `/api/v1/evidence/{incident_id}`
- **Timeline** → `/api/v1/timeline/latest`
- **Severity Meter** → Included in incident data
- **Analytics** → `/api/v1/analytics`
- **Alert Feed** → `/api/v1/alerts/feed`
- **Police Dashboard** → Via patrol units endpoint

The frontend can replace mock JSON with live API calls without modifying component structures.

## WebSocket Support

The architecture is prepared for WebSocket live updates:

- Real-time detection streaming
- Live incident updates
- Dynamic camera status changes
- Alert notifications

## Configuration

Key configuration options in `config.py`:

- Model device (CPU/GPU)
- Confidence thresholds
- Severity ranges
- API port and host
- Data retention policies
- Annotation styles

## Technology Stack

- **Python 3.12**
- **FastAPI** - Web framework
- **Ultralytics YOLO11** - Object detection
- **ByteTrack** - Object tracking
- **OpenCV** - Computer vision
- **Pydantic** - Data validation
- **NumPy/Pandas** - Data processing

## Development

### Development Mode
```bash
python main.py  # Runs with auto-reload
```

### Production Mode
```python
from main import run_production
run_production()
```

### Testing
```bash
pytest brain/tests/
```

## Notes

- All code follows SOLID principles
- Every module is independently testable
- No placeholder implementations
- Production-quality error handling
- Comprehensive logging
- Thread-safe database operations
- Clean separation of concerns
