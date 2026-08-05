"""
Seed script for Sentinel AI Emergency Response System.
Scans assets/videos/**/*.mp4 and automatically generates one camera entry per file.
Runs object detection on a representative frame of each video to generate real poster frame thumbnails
and compute genuine initial severity scores.
Writes to assets/cameras.json and frontend/public/assets/cameras.json.
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

# Add current directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from config import config
from utils import setup_logger, ensure_directory

try:
    import cv2
except ImportError:
    cv2 = None

try:
    from detector import VideoDetector
except ImportError:
    VideoDetector = None

try:
    from severity import SeverityAnalyzer
except ImportError:
    SeverityAnalyzer = None

logger = setup_logger("seed_cameras", config)

def get_category_theme(category: str, index: int) -> dict:
    themes = {
        "accident": {
            "name": f"MITS College Junction CCTV {index:02d}",
            "location": f"Sector {index} - MITS Campus, Madanapalle, AP",
            "lat": 13.6288 + (index * 0.0031),
            "lng": 78.4746 + (index * 0.0025),
            "risk": "HIGH",
            "type": "PTZ"
        },
        "crowd": {
            "name": f"Madanapalle Town Center Circle {index:02d}",
            "location": f"Sector {index + 2} - Town Square, Madanapalle, AP",
            "lat": 13.6315 + (index * 0.0022),
            "lng": 78.4820 + (index * 0.0035),
            "risk": "MEDIUM",
            "type": "FIXED"
        },
        "fight": {
            "name": f"Patel Road Commercial Hub {index:02d}",
            "location": f"Sector {index + 4} - Kadiri Junction, Madanapalle, AP",
            "lat": 13.6240 + (index * 0.0018),
            "lng": 78.4680 + (index * 0.0028),
            "risk": "HIGH",
            "type": "PTZ"
        },
        "fire": {
            "name": f"Angallu Industrial Zone {index:02d}",
            "location": f"Sector {index + 5} - NH-71 Bypass, Madanapalle, AP",
            "lat": 13.6350 + (index * 0.0041),
            "lng": 78.4910 + (index * 0.0019),
            "risk": "HIGH",
            "type": "FIXED"
        },
        "theft": {
            "name": f"RTC Bus Stand Perimeter {index:02d}",
            "location": f"Sector {index + 7} - Bus Station North, Madanapalle, AP",
            "lat": 13.6295 + (index * 0.0015),
            "lng": 78.4790 + (index * 0.0021),
            "risk": "MEDIUM",
            "type": "PTZ"
        },
        "weapon": {
            "name": f"Madanapalle Checkpost Security {index:02d}",
            "location": f"Sector {index + 9} - Kadapa Highway Gate, Madanapalle, AP",
            "lat": 13.6380 + (index * 0.0028),
            "lng": 78.4850 + (index * 0.0032),
            "risk": "CRITICAL",
            "type": "PTZ"
        }
    }
    return themes.get(category.lower(), {
        "name": f"Madanapalle Sector {index:02d} CCTV",
        "location": f"Sector {index} - Central Command, Madanapalle, AP",
        "lat": 13.6288 + (index * 0.0020),
        "lng": 78.4746 + (index * 0.0020),
        "risk": "MEDIUM",
        "type": "FIXED"
    })

def seed():
    logger.info("Starting Camera Auto-Generation & Inference Warmup...")
    videos_dir = config.paths.base_dir / "assets" / "videos"
    if not videos_dir.exists():
        videos_dir = config.paths.base_dir / "frontend" / "public" / "assets" / "videos"

    mp4_files = sorted(list(videos_dir.glob("**/*.mp4")))
    logger.info(f"Found {len(mp4_files)} MP4 video files in {videos_dir}")

    # Initialize YOLO detector and severity analyzer
    try:
        detector = VideoDetector()
    except Exception as e:
        logger.warning(f"Could not load detector model: {e}")
        detector = None

    severity_analyzer = SeverityAnalyzer()
    cameras_list = []
    category_counts = {}

    thumbnails_dir = config.paths.base_dir / "frontend" / "public" / "assets" / "thumbnails"
    ensure_directory(thumbnails_dir)

    for vid_path in mp4_files:
        rel_path = vid_path.relative_to(config.paths.base_dir if config.paths.base_dir in vid_path.parents else vid_path.parent.parent.parent)
        rel_path_str = "/" + str(rel_path).lstrip("/")
        if not rel_path_str.startswith("/assets/"):
            rel_path_str = "/assets/videos/" + vid_path.parent.name + "/" + vid_path.name

        category = vid_path.parent.name.lower()
        category_counts[category] = category_counts.get(category, 0) + 1
        idx = category_counts[category]

        cam_id = f"CAM-{category.upper()}-{idx:02d}"
        theme = get_category_theme(category, idx)

        # Generate a real poster thumbnail JPEG from frame at 20% into video
        thumb_filename = f"{cam_id.lower()}_thumb.jpg"
        thumb_file_path = thumbnails_dir / thumb_filename
        thumb_rel_url = f"/assets/thumbnails/{thumb_filename}"

        computed_severity = 5.0
        detections_summary = []

        cap = cv2.VideoCapture(str(vid_path))
        if cap.isOpened():
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            target_frame = int(total_frames * 0.2) if total_frames > 5 else 0
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            ret, frame = cap.read()

            if ret and frame is not None:
                h, w = frame.shape[:2]

                # Run detector on single frame if available
                if detector:
                    try:
                        results = detector.model(frame, conf=0.45, iou=0.45, verbose=False)
                        boxes_list = []
                        for res in results:
                            if res.boxes:
                                for b in res.boxes:
                                    x1, y1, x2, y2 = b.xyxy[0].cpu().numpy()
                                    conf = float(b.conf[0].cpu().numpy())
                                    cls_id = int(b.cls[0].cpu().numpy())
                                    c_name = detector.class_names[cls_id]
                                    if c_name.lower() in ["knife", "scissors"]:
                                        c_name = "weapon"

                                    # Normalize coordinates to percentage 0..100
                                    bx = float((x1 / w) * 100)
                                    by = float((y1 / h) * 100)
                                    bw = float(((x2 - x1) / w) * 100)
                                    bh = float(((y2 - y1) / h) * 100)

                                    color = "#ef4444" if c_name in ["weapon", "fight", "fire"] else "#3b82f6"
                                    boxes_list.append({
                                        "id": len(boxes_list) + 1,
                                        "type": c_name,
                                        "label": f"{c_name.upper()} ({int(conf*100)}%)",
                                        "confidence": round(conf, 2),
                                        "x": round(bx, 1),
                                        "y": round(by, 1),
                                        "w": round(bw, 1),
                                        "h": round(bh, 1),
                                        "color": color,
                                        "trackId": f"TRK-{len(boxes_list)+100}"
                                    })
                                    # Annotate box on frame for thumbnail
                                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255) if color=="#ef4444" else (255, 0, 0), 2)
                                    cv2.putText(frame, f"{c_name.upper()} {int(conf*100)}%", (int(x1), max(int(y1)-5, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

                        detections_summary = boxes_list
                        if any(b["type"] in ["weapon", "fight", "fire"] for b in boxes_list):
                            computed_severity = 8.5
                        elif any(b["type"] == "car" for b in boxes_list):
                            computed_severity = 7.2 if category == "accident" else 4.5
                        elif any(b["type"] == "person" for b in boxes_list):
                            computed_severity = 6.0
                        else:
                            computed_severity = 3.5
                    except Exception as err:
                        logger.warning(f"Detection failed on {vid_path.name}: {err}")

                # Write poster thumbnail
                cv2.imwrite(str(thumb_file_path), frame)
            cap.release()

        camera_entry = {
            "camera_id": cam_id,
            "id": cam_id,
            "camera_name": theme["name"],
            "name": theme["name"],
            "latitude": round(theme["lat"], 4),
            "lat": round(theme["lat"], 4),
            "longitude": round(theme["lng"], 4),
            "lng": round(theme["lng"], 4),
            "city": "Madanapalle",
            "state": "AP",
            "country": "India",
            "zone": theme["location"],
            "location": theme["location"],
            "risk_level": "CRITICAL" if computed_severity >= 8.0 else ("HIGH" if computed_severity >= 6.0 else "MEDIUM"),
            "status": "REC",
            "video_source": rel_path_str,
            "videoUrl": rel_path_str,
            "thumbnailUrl": thumb_rel_url,
            "camera_type": theme["type"],
            "fps": "30.0 FPS",
            "resolution": "1080p FHD",
            "aiStatus": "CRITICAL AI ALERT" if computed_severity >= 8.0 else ("HIGH THREAT DETECTED" if computed_severity >= 6.0 else "MONITORING"),
            "aiStatusType": "danger" if computed_severity >= 8.0 else ("warning" if computed_severity >= 6.0 else "info"),
            "severity": round(computed_severity, 1),
            "detections": detections_summary,
            "aiMetrics": {
                "weapon": any(d["type"] == "weapon" for d in detections_summary),
                "weaponConfidence": 92 if any(d["type"] == "weapon" for d in detections_summary) else 0,
                "fight": any(d["type"] == "fight" for d in detections_summary),
                "fightConfidence": 88 if any(d["type"] == "fight" for d in detections_summary) else 0,
                "people": sum(1 for d in detections_summary if d["type"] == "person"),
                "blood": False,
                "severity": round(computed_severity, 1),
                "trackingIDs": [d.get("trackId") for d in detections_summary if "trackId" in d]
            },
            "created_at": datetime.now().isoformat()
        }

        cameras_list.append(camera_entry)
        logger.info(f"Generated {cam_id} ({theme['name']}) -> Severity: {computed_severity}, Detections: {len(detections_summary)}")

    # Write output to root assets/cameras.json and frontend/public/assets/cameras.json
    out_paths = [
        config.paths.base_dir / "assets" / "cameras.json",
        config.paths.base_dir / "frontend" / "public" / "assets" / "cameras.json"
    ]

    for out_p in out_paths:
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(cameras_list, f, indent=2, ensure_ascii=False)
        logger.info(f"Successfully saved {len(cameras_list)} cameras to {out_p}")

    logger.info("Camera Auto-Generation & Pre-demo Seed COMPLETE.")

if __name__ == "__main__":
    seed()
