"""
Database module for Sentinel AI Emergency Response System.
Implements filesystem-based storage under brain/storage/videos/{video_id}/ and index.json.
Zero external DB dependencies — pure JSON and file-based persistence.
"""

import json
import threading
import traceback
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from config import config
from schemas import (
    Incident, DetectionResult, TrackResult, Event,
    SeverityResult, ReasoningResult, TimelineEvent,
    IncidentReport, Alert, EvidenceItem
)
from utils import setup_logger, save_json, load_json, ensure_directory


class DatabaseManager:
    """
    Filesystem database manager.
    Stores analysis artifacts under:
      brain/storage/videos/{video_id}/
        - original.mp4
        - annotated.mp4
        - detections.json
        - tracking.json
        - events.json
        - incident.json
        - severity.json
        - reasoning.json
        - timeline.json
        - report.json
      brain/storage/index.json
    """

    def __init__(self):
        self.logger = setup_logger("database", config)
        self.storage_dir = config.paths.brain_dir / "storage"
        self.videos_dir = self.storage_dir / "videos"
        self.index_file = self.storage_dir / "index.json"

        ensure_directory(self.storage_dir)
        ensure_directory(self.videos_dir)

        self.lock = threading.Lock()
        self.index_cache: List[Dict[str, Any]] = []

        self._load_index()
        self.logger.info(f"[DATABASE] Storage initialized at {self.storage_dir}")

    # -----------------------------------------------------------------------
    # Index Management
    # -----------------------------------------------------------------------

    def _load_index(self) -> None:
        """Load index.json into memory."""
        with self.lock:
            if self.index_file.exists():
                data = load_json(self.index_file)
                if isinstance(data, list):
                    self.index_cache = data
                else:
                    self.index_cache = []
            else:
                self.index_cache = []
                save_json([], self.index_file)

    def _save_index(self) -> None:
        """Write index_cache to index.json."""
        try:
            save_json(self.index_cache, self.index_file)
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to save index.json: {e}")

    def update_index_entry(self, video_id: str, incident_id: str, status: str, severity: float = 1.0, title: str = "", location: str = "") -> None:
        """Add or update an index entry."""
        with self.lock:
            entry_idx = next((i for i, item in enumerate(self.index_cache) if item.get("video_id") == video_id or item.get("incident_id") == incident_id), None)
            now_iso = datetime.now().isoformat()
            
            new_entry = {
                "video_id": video_id,
                "incident_id": incident_id,
                "status": status,
                "severity": severity,
                "title": title,
                "location": location,
                "created_at": now_iso,
                "thumbnail_path": f"/api/v1/storage/videos/{video_id}/thumbnail.jpg"
            }

            if entry_idx is not None:
                self.index_cache[entry_idx].update(new_entry)
            else:
                self.index_cache.insert(0, new_entry)

            self._save_index()

    def get_index(self) -> List[Dict[str, Any]]:
        with self.lock:
            return list(self.index_cache)

    # -----------------------------------------------------------------------
    # Helper: Video directory resolver
    # -----------------------------------------------------------------------

    def get_video_dir(self, video_id: str) -> Path:
        path = self.videos_dir / video_id
        ensure_directory(path)
        return path

    def _get_latest_video_id(self) -> Optional[str]:
        with self.lock:
            if self.index_cache:
                return self.index_cache[0].get("video_id")
        # Fallback to directories
        dirs = [d for d in self.videos_dir.iterdir() if d.is_dir()]
        if not dirs:
            return None
        dirs.sort(key=lambda d: d.stat().st_mtime, reverse=True)
        return dirs[0].name

    # -----------------------------------------------------------------------
    # Incident operations
    # -----------------------------------------------------------------------

    def save_incident(self, incident: Incident, video_id: Optional[str] = None) -> None:
        vid = video_id or str(incident.id)
        vdir = self.get_video_dir(vid)
        file_path = vdir / "incident.json"

        try:
            with self.lock:
                save_json(incident.model_dump(mode="json"), file_path)
                self.update_index_entry(
                    video_id=vid,
                    incident_id=incident.id,
                    status=incident.status.value if hasattr(incident.status, "value") else str(incident.status),
                    severity=incident.severity,
                    title=incident.title,
                    location=incident.location
                )
            self.logger.info(f"[DATABASE] Saved incident {incident.id} to {file_path}")
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to save incident {incident.id}: {e}\n{traceback.format_exc()}")

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        # Search by video_id or incident_id
        vdir = self.videos_dir / incident_id
        if not vdir.exists():
            # Check index for matching incident_id
            with self.lock:
                entry = next((e for e in self.index_cache if e.get("incident_id") == incident_id or e.get("video_id") == incident_id), None)
                if entry:
                    vdir = self.videos_dir / entry.get("video_id", incident_id)

        file_path = vdir / "incident.json"
        data = load_json(file_path)
        if data:
            try:
                return Incident(**data)
            except Exception as e:
                self.logger.error(f"[DATABASE] Failed to parse incident from {file_path}: {e}")
        return None

    def get_latest_incident(self) -> Optional[Incident]:
        vid = self._get_latest_video_id()
        if vid:
            return self.get_incident(vid)
        return None

    def get_all_incidents(self, limit: int = 100) -> List[Incident]:
        incidents = []
        with self.lock:
            vids = [e.get("video_id") for e in self.index_cache if e.get("video_id")][:limit]

        for vid in vids:
            inc = self.get_incident(vid)
            if inc:
                incidents.append(inc)

        return incidents

    # -----------------------------------------------------------------------
    # Detection operations
    # -----------------------------------------------------------------------

    def save_detections(self, detections: List[DetectionResult], video_id: Optional[str] = None) -> None:
        if not detections:
            return
        vid = video_id or detections[0].camera_id or self._get_latest_video_id() or "default"
        vdir = self.get_video_dir(vid)
        file_path = vdir / "detections.json"

        try:
            with self.lock:
                save_json([d.model_dump(mode="json") for d in detections], file_path)
            self.logger.info(f"[DATABASE] Saved {len(detections)} detections to {file_path}")
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to save detections to {file_path}: {e}")

    def get_latest_detections(self, limit: int = 100, video_id: Optional[str] = None) -> List[DetectionResult]:
        vid = video_id or self._get_latest_video_id()
        if not vid:
            return []
        vdir = self.videos_dir / vid
        file_path = vdir / "detections.json"
        data = load_json(file_path)
        if data and isinstance(data, list):
            try:
                return [DetectionResult(**d) for d in data[:limit]]
            except Exception as e:
                self.logger.error(f"[DATABASE] Failed to parse detections from {file_path}: {e}")
        return []

    # -----------------------------------------------------------------------
    # Tracking operations
    # -----------------------------------------------------------------------

    def save_tracks(self, tracks: List[TrackResult], video_id: Optional[str] = None) -> None:
        if not tracks:
            return
        vid = video_id or tracks[0].camera_id or self._get_latest_video_id() or "default"
        vdir = self.get_video_dir(vid)
        file_path = vdir / "tracking.json"

        try:
            with self.lock:
                save_json([t.model_dump(mode="json") for t in tracks], file_path)
            self.logger.info(f"[DATABASE] Saved {len(tracks)} tracks to {file_path}")
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to save tracks to {file_path}: {e}")

    def get_latest_tracks(self, limit: int = 100, video_id: Optional[str] = None) -> List[TrackResult]:
        vid = video_id or self._get_latest_video_id()
        if not vid:
            return []
        vdir = self.videos_dir / vid
        file_path = vdir / "tracking.json"
        data = load_json(file_path)
        if data and isinstance(data, list):
            try:
                return [TrackResult(**t) for t in data[:limit]]
            except Exception as e:
                self.logger.error(f"[DATABASE] Failed to parse tracks from {file_path}: {e}")
        return []

    # -----------------------------------------------------------------------
    # Event operations
    # -----------------------------------------------------------------------

    def save_events(self, events: List[Event], video_id: Optional[str] = None) -> None:
        if not events:
            return
        vid = video_id or events[0].camera_id or self._get_latest_video_id() or "default"
        vdir = self.get_video_dir(vid)
        file_path = vdir / "events.json"

        try:
            with self.lock:
                save_json([e.model_dump(mode="json") for e in events], file_path)
            self.logger.info(f"[DATABASE] Saved {len(events)} events to {file_path}")
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to save events to {file_path}: {e}")

    def get_latest_events(self, limit: int = 100, video_id: Optional[str] = None) -> List[Event]:
        vid = video_id or self._get_latest_video_id()
        if not vid:
            return []
        vdir = self.videos_dir / vid
        file_path = vdir / "events.json"
        data = load_json(file_path)
        if data and isinstance(data, list):
            try:
                return [Event(**e) for e in data[:limit]]
            except Exception as e:
                self.logger.error(f"[DATABASE] Failed to parse events from {file_path}: {e}")
        return []

    # -----------------------------------------------------------------------
    # Severity operations
    # -----------------------------------------------------------------------

    def save_severity(self, severity: SeverityResult, video_id: Optional[str] = None) -> None:
        vid = video_id or severity.incident_id or self._get_latest_video_id() or "default"
        vdir = self.get_video_dir(vid)
        file_path = vdir / "severity.json"

        try:
            with self.lock:
                save_json(severity.model_dump(mode="json"), file_path)
            self.logger.info(f"[DATABASE] Saved severity to {file_path}")
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to save severity: {e}")

    def get_latest_severity(self, video_id: Optional[str] = None) -> Optional[SeverityResult]:
        vid = video_id or self._get_latest_video_id()
        if not vid:
            return None
        vdir = self.videos_dir / vid
        file_path = vdir / "severity.json"
        data = load_json(file_path)
        if data:
            try:
                return SeverityResult(**data)
            except Exception as e:
                self.logger.error(f"[DATABASE] Failed to parse severity from {file_path}: {e}")
        return None

    # -----------------------------------------------------------------------
    # Reasoning operations
    # -----------------------------------------------------------------------

    def save_reasoning(self, reasoning: ReasoningResult, video_id: Optional[str] = None) -> None:
        vid = video_id or reasoning.incident_id or self._get_latest_video_id() or "default"
        vdir = self.get_video_dir(vid)
        file_path = vdir / "reasoning.json"

        try:
            with self.lock:
                save_json(reasoning.model_dump(mode="json"), file_path)
            self.logger.info(f"[DATABASE] Saved reasoning to {file_path}")
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to save reasoning: {e}")

    def get_latest_reasoning(self, video_id: Optional[str] = None) -> Optional[ReasoningResult]:
        vid = video_id or self._get_latest_video_id()
        if not vid:
            return None
        vdir = self.videos_dir / vid
        file_path = vdir / "reasoning.json"
        data = load_json(file_path)
        if data:
            try:
                return ReasoningResult(**data)
            except Exception as e:
                self.logger.error(f"[DATABASE] Failed to parse reasoning from {file_path}: {e}")
        return None

    # -----------------------------------------------------------------------
    # Timeline operations
    # -----------------------------------------------------------------------

    def save_timeline(self, timeline: List[TimelineEvent], video_id: Optional[str] = None) -> None:
        vid = video_id or self._get_latest_video_id() or "default"
        vdir = self.get_video_dir(vid)
        file_path = vdir / "timeline.json"

        try:
            with self.lock:
                save_json([t.model_dump(mode="json") for t in timeline], file_path)
            self.logger.info(f"[DATABASE] Saved {len(timeline)} timeline events to {file_path}")
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to save timeline: {e}")

    def get_latest_timeline(self, video_id: Optional[str] = None) -> List[TimelineEvent]:
        vid = video_id or self._get_latest_video_id()
        if not vid:
            return []
        vdir = self.videos_dir / vid
        file_path = vdir / "timeline.json"
        data = load_json(file_path)
        if data and isinstance(data, list):
            try:
                return [TimelineEvent(**t) for t in data]
            except Exception as e:
                self.logger.error(f"[DATABASE] Failed to parse timeline from {file_path}: {e}")
        return []

    # -----------------------------------------------------------------------
    # Report operations
    # -----------------------------------------------------------------------

    def save_report(self, report: IncidentReport, video_id: Optional[str] = None) -> None:
        vid = video_id or report.incident.id or self._get_latest_video_id() or "default"
        vdir = self.get_video_dir(vid)
        file_path = vdir / "report.json"

        try:
            with self.lock:
                save_json(report.model_dump(mode="json"), file_path)
            self.logger.info(f"[DATABASE] Saved report to {file_path}")
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to save report: {e}")

    def get_latest_report(self, video_id: Optional[str] = None) -> Optional[IncidentReport]:
        vid = video_id or self._get_latest_video_id()
        if not vid:
            return None
        vdir = self.videos_dir / vid
        file_path = vdir / "report.json"
        data = load_json(file_path)
        if data:
            try:
                return IncidentReport(**data)
            except Exception as e:
                self.logger.error(f"[DATABASE] Failed to parse report from {file_path}: {e}")
        return None

    # -----------------------------------------------------------------------
    # Alerts & Evidence compatibility
    # -----------------------------------------------------------------------

    def save_alert(self, alert: Alert) -> None:
        pass

    def get_alerts(self, limit: int = 50) -> List[Alert]:
        return []

    def save_evidence(self, evidence_items: List[EvidenceItem]) -> None:
        pass

    def get_evidence(self, limit: int = 50) -> List[EvidenceItem]:
        return []

    def get_statistics(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "total_incidents": len(self.index_cache),
                "storage_path": str(self.storage_dir)
            }


# Global database instance
database = DatabaseManager()
