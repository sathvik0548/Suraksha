# Sentinel AI System - Setup Guide

## System Overview
The Sentinel AI Emergency Response System is now fully integrated with:
- FastAPI backend for AI processing
- React frontend for dashboard visualization
- Real-time camera management from `assets/cameras.json`
- Video analysis with AI pipeline
- Live incident monitoring and emergency alerts
- Evidence gallery with bounding boxes
- Demo mode for automatic testing

## Prerequisites
- Python 3.12+
- Node.js 18+
- Required Python packages (see brain/requirements.txt)
- Required Node packages (see package.json)

## Installation

### Backend Setup
```bash
cd brain
pip install -r requirements.txt
```

### Frontend Setup
```bash
npm install
```

## Starting the System

### Option 1: Manual Start (Recommended)
1. **Start Backend:**
   ```bash
   cd brain
   python main.py
   ```
   Backend will run on: http://localhost:8000

2. **Start Frontend:**
   ```bash
   npm run dev
   ```
   Frontend will run on: http://localhost:3000

### Option 2: Using Batch File (Windows)
Run `start.bat` to start both servers automatically.

## System Features

### Camera Management
- Cameras loaded from `assets/cameras.json`
- CRUD operations via `/api/cameras` endpoints
- Real-time status updates
- Map integration with Leaflet

### Video Analysis
- Click any camera to view details
- Click "Analyze" to process video
- Real-time progress tracking
- Automatic incident generation
- Bounding box annotation

### Emergency Alerts
- Automatic fullscreen dialog for severity >= 7.0
- Animated siren and red border
- Auto-close after 10 seconds
- Accept/View Evidence actions

### Demo Mode
- Located in Command Center view
- Start/Pause buttons
- Automatically analyzes random cameras every 20 seconds
- Updates dashboard in real-time

### Investigation View
- Original and annotated video comparison
- AI reasoning display
- Timeline events
- Evidence gallery with thumbnails
- Police and witness notes

### Analytics
- Real-time statistics from backend
- Incident trend charts
- Category distribution
- System health metrics

## API Endpoints

### Camera Management
- `GET /api/cameras` - List all cameras
- `POST /api/cameras` - Create camera
- `PUT /api/cameras/{id}` - Update camera
- `DELETE /api/cameras/{id}` - Delete camera

### Video Analysis
- `POST /api/v1/analyze` - Analyze video
- `GET /api/v1/incident/latest` - Get latest incident status

### Real-time Data
- `GET /api/v1/statistics` - System statistics
- `GET /api/v1/incidents/cards` - Incident cards
- `GET /api/v1/alerts/feed` - Alerts feed
- `GET /api/v1/timeline/latest` - Latest timeline
- `GET /api/v1/reasoning/latest` - AI reasoning
- `GET /api/v1/severity/latest` - Severity assessment
- `GET /api/v1/evidence` - Evidence data
- `GET /api/v1/annotated-video` - Annotated video

## Troubleshooting

### Backend won't start
- Check Python version (3.12+)
- Install required packages: `pip install -r brain/requirements.txt`
- Check if port 8000 is available

### Frontend won't start
- Check Node.js version (18+)
- Install dependencies: `npm install`
- Check if port 3000 is available

### Cameras not loading
- Ensure `assets/cameras.json` exists
- Check backend is running
- Check browser console for errors

### Video analysis fails
- Ensure video files exist in `assets/videos/`
- Check backend logs for errors
- Verify file paths in cameras.json

## Testing the System

1. **Start both servers** (backend and frontend)
2. **Open** http://localhost:3000 in browser
3. **Navigate** to Command Center view
4. **Click** on any camera to see details
5. **Click** "Analyze" to process video
6. **Wait** for analysis to complete
7. **View** emergency dialog (if severity >= 7.0)
8. **Navigate** to Investigation view to see results
9. **Enable** Demo Mode for automatic testing

## Production Deployment

For production deployment:
1. Set `debug=False` in `brain/config.py`
2. Use proper video file storage
3. Configure database for persistence
4. Enable HTTPS
5. Set up proper authentication
6. Configure CORS settings

## Support

For issues or questions:
- Check backend logs in `brain/logs/`
- Check browser console for frontend errors
- Verify API endpoints at http://localhost:8000/api/docs
