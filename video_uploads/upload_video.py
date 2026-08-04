#!/usr/bin/env python3
"""
Standalone Video Uploader Script for Suraksha Emergency Response System.
Uploads any local video file directly to the deployed backend API for YOLO11 analysis.

Usage:
  python upload_video.py <path_to_video> [--api_url API_URL] [--camera_name NAME] [--location LOCATION]

Example:
  python upload_video.py my_test_video.mp4 --api_url https://suraksha-backend.onrender.com
"""

import sys
import os
import argparse
import time
import requests

def upload_video(video_path: str, api_url: str, camera_name: str, location: str):
    if not os.path.exists(video_path):
        print(f"❌ Error: Video file not found at '{video_path}'")
        sys.exit(1)

    api_url = api_url.rstrip('/')
    endpoint = f"{api_url}/api/v1/analyze"

    print("=" * 60)
    print("SURAKSHA SMART CITY COMMAND CENTER - VIDEO UPLOADER")
    print("=" * 60)
    print(f"Target API Endpoint : {endpoint}")
    print(f"Video File           : {video_path} ({os.path.getsize(video_path) / (1024*1024):.2f} MB)")
    print(f"Camera Name          : {camera_name}")
    print(f"Location             : {location}")
    print("=" * 60)

    try:
        with open(video_path, 'rb') as f:
            files = {'video': (os.path.basename(video_path), f, 'video/mp4')}
            data = {
                'camera_id': 'CAM-CLI-UPLOAD',
                'camera_name': camera_name,
                'location': location,
                'lat': '40.7128',
                'lng': '-74.0060'
            }
            print("🚀 Uploading video to server...")
            response = requests.post(endpoint, files=files, data=data)

        if response.status_code != 200:
            print(f"❌ Error: Server returned HTTP {response.status_code}")
            print(response.text)
            sys.exit(1)

        result = response.json()
        job_id = result.get('job_id') or result.get('incident_id')
        print(f"✅ Upload successful! Job ID: {job_id}")
        print("⌛ Monitoring AI analysis stage progress...")

        status_url = f"{api_url}/api/v1/analyze/status/{job_id}"
        while True:
            st_res = requests.get(status_url)
            if st_res.status_code == 200:
                st = st_res.json()
                status = st.get('status')
                stage = st.get('stage', 'processing')
                print(f"   [Stage: {stage}] Status: {status}")

                if status == 'completed':
                    print("=" * 60)
                    print("🎉 ANALYSIS COMPLETE!")
                    print(f"   Incident ID   : {st.get('incident_id')}")
                    print(f"   Severity      : {st.get('severity', 'N/A')}")
                    print(f"   Detections    : {st.get('detections_count', 0)}")
                    print(f"   Annotated MP4 : {api_url}/api/v1/storage/videos/{job_id}/annotated.mp4")
                    print("=" * 60)
                    break
                elif status == 'failed':
                    print(f"❌ Analysis failed: {st.get('error')}")
                    break
            time.sleep(2)

    except Exception as e:
        print(f"❌ Request error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Upload video to Suraksha Command Center API")
    parser.add_argument("video_path", help="Path to local video file (.mp4, .avi, .mov, .mkv)")
    parser.add_argument("--api_url", default="http://localhost:8000", help="Backend API base URL (default: http://localhost:8000)")
    parser.add_argument("--camera_name", default="CLI Surveillance Camera", help="Camera name")
    parser.add_argument("--location", default="Sector 5 - Custom Uplink", help="Location description")

    args = parser.parse_args()
    upload_video(args.video_path, args.api_url, args.camera_name, args.location)
