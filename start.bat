@echo off
echo Starting Sentinel AI System...
echo.
echo Starting Backend Server...
cd brain
start python main.py
cd ..
echo.
echo Starting Frontend Server...
start node node_modules\vite\bin\vite.js --port=3000 --host=0.0.0.0
echo.
echo System started!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/api/docs
pause