# Suraksha Smart City Command Center — 3-Part Architecture & Deployment Guide

This project has been split into 3 clear parts:

```
Suraksha/
├── frontend/         # React + Vite UI (Vercel deployment)
├── backend/          # FastAPI + YOLO11 AI Engine (Render deployment)
└── video_uploads/    # Video storage, sample clips & upload_video.py CLI script
```

---

## 1. Local Starter Guide (Run Everything Locally)

### Step 1.1: Start the Backend (FastAPI + YOLO11)
```bash
cd backend
pip install -r requirements.txt
python main.py
```
- API will start at: `http://localhost:8000`
- Interactive Swagger docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### Step 1.2: Start the Frontend (React + Vite)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
- Open your browser at: `http://localhost:3000` (or `http://localhost:5173`)

### Step 1.3: Upload Custom Videos for AI Processing
You can upload videos in **two ways**:
1. **Via Web Interface**: Go to `http://localhost:3000` → **Live Cameras** → Click **Analyze Custom Video** → Drag and drop any `.mp4`, `.avi`, `.mov`, `.mkv` file up to 500MB.
2. **Via CLI Script**:
   ```bash
   cd video_uploads
   python upload_video.py path/to/your_video.mp4 --api_url http://localhost:8000
   ```

---

## 2. Deploying Backend to Render (Render.com)

Render hosts Python FastAPI applications with persistent local storage.

### Step 2.1: Push Project to GitHub
Make sure your 3-part repository structure (`frontend/`, `backend/`, `video_uploads/`) is committed and pushed to GitHub:
```bash
git add .
git commit -m "3-part architecture for production deployment"
git push origin main
```

### Step 2.2: Create Render Web Service
1. Sign in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`baba-fakhrudhin/Suraksha`).
4. Configure the Web Service settings:
   - **Name**: `suraksha-backend`
   - **Region**: Choose closest to you (e.g. Oregon/Frankfurt)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn api:app --host 0.0.0.0 --port $PORT --workers 1`
   - **Instance Type**: Free or Starter tier (>=512MB RAM recommended)

### Step 2.3: Set Environment Variables in Render
Under the **Environment** tab on Render, add:
- `SENTINEL_MODEL_DEVICE` = `cpu`
- `DEMO_MODE` = `false`
- `CORS_ORIGINS` = `https://your-vercel-app.vercel.app,http://localhost:3000`

### Step 2.4: Save & Deploy
- Click **Create Web Service**.
- Copy your public Render URL (e.g., `https://suraksha-backend.onrender.com`).

---

## 3. Deploying Frontend to Vercel (Vercel.com)

Vercel provides instant global deployment for Vite React frontends.

### Step 3.1: Connect Repository to Vercel
1. Sign in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`baba-fakhrudhin/Suraksha`).

### Step 3.2: Configure Vercel Project Settings
- **Framework Preset**: `Vite`
- **Root Directory**: Select `frontend` (Click Edit next to Root Directory and pick `frontend`).
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Step 3.3: Set Environment Variables in Vercel
Under **Environment Variables**:
- `VITE_API_BASE_URL` = `https://suraksha-backend.onrender.com` (Your Render Backend URL)

### Step 3.4: Deploy
- Click **Deploy**.
- Once deployment finishes, Vercel gives you a public production URL (e.g., `https://suraksha-frontend.vercel.app`).

---

## 4. End-to-End Verification Checklist

1. Open your Vercel URL in browser (`https://suraksha-frontend.vercel.app`).
2. Verify **SYSTEM ONLINE** status badge is green.
3. Go to **Live Cameras** → Click **Analyze Custom Video**.
4. Select a local video clip and start analysis.
5. Confirm stage progress updates (`detection` → `tracking` → `events` → `severity` → `completed`).
6. Confirm bounding boxes and severity alerts populate live!
