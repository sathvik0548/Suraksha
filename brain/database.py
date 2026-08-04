"""
Database module for Sentinel AI Emergency Response System.
Handles data persistence using JSON file-based storage with clean architecture.

FIXED:
  - _save_incidents now calls model_dump() on Incident objects before serialization
  - save_severity/reasoning/timeline/report now use self.lock for thread safety
  - Added save_alert, get_alerts, save_evidence, get_evidence methods
  - Added alerts_file and evidence_file paths
  - All saves use try/except with full logging so no failure is silent
"""

import json
import threading
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any
from collections import deque
import uuid

from config import config
from schemas import (
    Incident, DetectionResult, TrackResult, Event,
    SeverityResult, ReasoningResult, TimelineEvent,
    IncidentReport, Alert, EvidenceItem
)
from utils import setup_logger, save_json, load_json, ensure_directory


class DatabaseManager:
    """
    Thread-safe database manager for JSON-based storage.
    Provides data persistence with retention policies.
    """

    def __init__(self):
        """Initialize database manager."""
        self.logger = setup_logger("database", config)
        self.data_dir = config.database.data_dir
        ensure_directory(self.data_dir)

        # Thread safety — single lock for all operations
        self.lock = threading.Lock()

        # In-memory caches for fast access
        self.incidents_cache: Dict[str, Incident] = {}
        self.detections_cache: deque = deque(maxlen=config.database.max_detections_stored)
        self.tracks_cache: deque = deque(maxlen=config.database.max_detections_stored)
        self.events_cache: deque = deque(maxlen=config.database.max_detections_stored)
        self.alerts_cache: deque = deque(maxlen=500)
        self.evidence_cache: deque = deque(maxlen=500)

        # File paths
        self.incidents_file = self.data_dir / "incidents.json"
        self.detections_file = self.data_dir / "detections.json"
        self.tracks_file = self.data_dir / "tracking.json"
        self.events_file = self.data_dir / "events.json"
        self.severity_file = self.data_dir / "severity.json"
        self.reasoning_file = self.data_dir / "reasoning.json"
        self.timeline_file = self.data_dir / "timeline.json"
        self.report_file = self.data_dir / "report.json"
        self.alerts_file = self.data_dir / "alerts.json"
        self.evidence_file = self.data_dir / "evidence.json"

        # Load existing data
        self._load_all_data()

        self.logger.info(f"[DATABASE] Database manager initialized at {self.data_dir}")

    # -----------------------------------------------------------------------
    # Internal: load from disk on startup
    # -----------------------------------------------------------------------

    def _load_all_data(self) -> None:
        """Load all data from JSON files into cache."""
        with self.lock:
            self._load_incidents()
            self._load_detections()
            self._load_tracks()
            self._load_events()
            self._load_alerts()
            self._load_evidence()

    def _load_incidents(self) -> None:
        incidents_data = load_json(self.incidents_file)
        if incidents_data and isinstance(incidents_data, list):
            for inc_data in incidents_data:
                try:
                    incident = Incident(**inc_data)
                    self.incidents_cache[incident.id] = incident
                except Exception as e:
                    self.logger.error(f"[DATABASE] Failed to load incident: {e} | data={inc_data}")

    def _load_detections(self) -> None:
        detections_data = load_json(self.detections_file)
        if detections_data and isinstance(detections_data, list):
            for det_data in detections_data:
                try:
                    detection = DetectionResult(**det_data)
                    self.detections_cache.append(detection)
                except Exception as e:
                    self.logger.error(f"[DATABASE] Failed to load detection: {e}")

    def _load_tracks(self) -> None:
        tracks_data = load_json(self.tracks_file)
        if tracks_data and isinstance(tracks_data, list):
            for track_data in tracks_data:
                try:
                    track = TrackResult(**track_data)
                    self.tracks_cache.append(track)
                except Exception as e:
                    self.logger.error(f"[DATABASE] Failed to load track: {e}")

    def _load_events(self) -> None:
        events_data = load_json(self.events_file)
        if events_data and isinstance(events_data, list):
            for event_data in events_data:
                try:
                    event = Event(**event_data)
                    self.events_cache.append(event)
                except Exception as e:
                    self.logger.error(f"[DATABASE] Failed to load event: {e}")

    def _load_alerts(self) -> None:
        alerts_data = load_json(self.alerts_file)
        if alerts_data and isinstance(alerts_data, list):
            for alert_data in alerts_data:
                try:
                    alert = Alert(**alert_data)
                    self.alerts_cache.append(alert)
                except Exception as e:
                    self.logger.error(f"[DATABASE] Failed to load alert: {e}")

    def _load_evidence(self) -> None:
        evidence_data = load_json(self.evidence_file)
        if evidence_data and isinstance(evidence_data, list):
            for ev_data in evidence_data:
                try:
                    ev = EvidenceItem(**ev_data)
                    self.evidence_cache.append(ev)
                except Exception as e:
                    self.logger.error(f"[DATABASE] Failed to load evidence: {e}")

    # -----------------------------------------------------------------------
    # Internal: persist to disk
    # -----------------------------------------------------------------------

    def _save_incidents(self) -> None:
        """Save incidents to JSON file. FIXED: calls model_dump() on each Incident."""
        try:
            incidents_list = [inc.model_dump(mode="json") for inc in self.incidents_cache.values()]
            save_json(incidents_list, self.incidents_file)
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to persist incidents: {e}\n{traceback.format_exc()}")

    def _save_detections(self) -> None:
        try:
            detections_list = [d.model_dump(mode="json") for d in self.detections_cache]
            save_json(detections_list, self.detections_file)
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to persist detections: {e}")

    def _save_tracks(self) -> None:
        try:
            tracks_list = [t.model_dump(mode="json") for t in self.tracks_cache]
            save_json(tracks_list, self.tracks_file)
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to persist tracks: {e}")

    def _save_events(self) -> None:
        try:
            events_list = [e.model_dump(mode="json") for e in self.events_cache]
            save_json(events_list, self.events_file)
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to persist events: {e}")

    def _save_alerts(self) -> None:
        try:
            alerts_list = [a.model_dump(mode="json") for a in self.alerts_cache]
            save_json(alerts_list, self.alerts_file)
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to persist alerts: {e}")

    def _save_evidence(self) -> None:
        try:
            evidence_list = [ev.model_dump(mode="json") for ev in self.evidence_cache]
            save_json(evidence_list, self.evidence_file)
        except Exception as e:
            self.logger.error(f"[DATABASE] Failed to persist evidence: {e}")

    # -----------------------------------------------------------------------
    # Incident operations
    # -----------------------------------------------------------------------

    def save_incident(self, incident: Incident) -> None:
        """Save or update an incident."""
        self.logger.info(f"[SAVE INCIDENT] Saving incident: {incident.id} | severity={incident.severity} | title={incident.title}")
        try:
            with self.lock:
                self.incidents_cache[incident.id] = incident

                # Enforce retention policy
                if len(self.incidents_cache) > config.database.max_incidents_stored:
                    oldest_id = min(
                        self.incidents_cache.keys(),
                        key=lambda k: self.incidents_cache[k].timestamp
                    )
                    del self.incidents_cache[oldest_id]
                    self.logger.info(f"[DATABASE] Evicted oldest incident: {oldest_id}")

                self._save_incidents()
            self.logger.info(f"[SAVE INCIDENT] [OK] Incident {incident.id} persisted to {self.incidents_file}")
        except Exception as e:
            self.logger.error(f"[SAVE INCIDENT] ❌ Failed to save incident {incident.id}: {e}\n{traceback.format_exc()}")
            raise

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        with self.lock:
            return self.incidents_cache.get(incident_id)

    def get_latest_incident(self) -> Optional[Incident]:
        with self.lock:
            if not self.incidents_cache:
                return None
            return max(
                self.incidents_cache.values(),
                key=lambda inc: inc.timestamp
            )

    def get_all_incidents(self, limit: int = 100) -> List[Incident]:
        with self.lock:
            incidents = sorted(
                self.incidents_cache.values(),
                key=lambda inc: inc.timestamp,
                reverse=True
            )
            return incidents[:limit]

    # -----------------------------------------------------------------------
    # Detection operations
    # -----------------------------------------------------------------------

    def save_detections(self, detections: List[DetectionResult]) -> None:
        self.logger.info(f"[SAVE DETECTIONS] Saving {len(detections)} detections")
        try:
            with self.lock:
                for detection in detections:
                    self.detections_cache.append(detection)
                self._save_detections()
            self.logger.info(f"[SAVE DETECTIONS] [OK] {len(detections)} detections persisted")
        except Exception as e:
            self.logger.error(f"[SAVE DETECTIONS] [ERROR] Failed: {e}\n{traceback.format_exc()}")
            raise

    def get_latest_detections(self, limit: int = 100) -> List[DetectionResult]:
        with self.lock:
            return list(self.detections_cache)[-limit:]

    # -----------------------------------------------------------------------
    # Tracking operations
    # -----------------------------------------------------------------------

    def save_tracks(self, tracks: List[TrackResult]) -> None:
        self.logger.info(f"[SAVE TRACKS] Saving {len(tracks)} tracks")
        try:
            with self.lock:
                for track in tracks:
                    self.tracks_cache.append(track)
                self._save_tracks()
            self.logger.info(f"[SAVE TRACKS] [OK] {len(tracks)} tracks persisted")
        except Exception as e:
            self.logger.error(f"[SAVE TRACKS] [ERROR] Failed: {e}\n{traceback.format_exc()}")
            raise

    def get_latest_tracks(self, limit: int = 100) -> List[TrackResult]:
        with self.lock:
            return list(self.tracks_cache)[-limit:]

    # -----------------------------------------------------------------------
    # Event operations
    # -----------------------------------------------------------------------

    def save_events(self, events: List[Event]) -> None:
        self.logger.info(f"[SAVE EVENTS] Saving {len(events)} events")
        try:
            with self.lock:
                for event in events:
                    self.events_cache.append(event)
                self._save_events()
            self.logger.info(f"[SAVE EVENTS] [OK] {len(events)} events persisted")
        except Exception as e:
            self.logger.error(f"[SAVE EVENTS] [ERROR] Failed: {e}\n{traceback.format_exc()}")
            raise

    def get_latest_events(self, limit: int = 100) -> List[Event]:
        with self.lock:
            return list(self.events_cache)[-limit:]

    # -----------------------------------------------------------------------
    # Severity operations
    # -----------------------------------------------------------------------

    def save_severity(self, severity: SeverityResult) -> None:
        self.logger.info(f"[SAVE SEVERITY] Saving severity: {severity.severity_score:.2f} ({severity.severity_level.value})")
        try:
            with self.lock:
                save_json(severity.model_dump(mode="json"), self.severity_file)
            self.logger.info(f"[SAVE SEVERITY] [OK] Severity persisted to {self.severity_file}")
        except Exception as e:
            self.logger.error(f"[SAVE SEVERITY] [ERROR] Failed: {e}\n{traceback.format_exc()}")
            raise

    def get_latest_severity(self) -> Optional[SeverityResult]:
        with self.lock:
            data = load_json(self.severity_file)
            if data:
                try:
                    return SeverityResult(**data)
                except Exception as e:
                    self.logger.error(f"[DATABASE] Failed to load severity: {e}")
            return None

    # -----------------------------------------------------------------------
    # Reasoning operations
    # -----------------------------------------------------------------------

    def save_reasoning(self, reasoning: ReasoningResult) -> None:
        self.logger.info(f"[SAVE REASONING] Saving reasoning result")
        try:
            with self.lock:
                save_json(reasoning.model_dump(mode="json"), self.reasoning_file)
            self.logger.info(f"[SAVE REASONING] [OK] Reasoning persisted to {self.reasoning_file}")
        except Exception as e:
            self.logger.error(f"[SAVE REASONING] [ERROR] Failed: {e}\n{traceback.format_exc()}")
            raise

    def get_latest_reasoning(self) -> Optional[ReasoningResult]:
        with self.lock:
            data = load_json(self.reasoning_file)
            if data:
                try:
                    return ReasoningResult(**data)
                except Exception as e:
                    self.logger.error(f"[DATABASE] Failed to load reasoning: {e}")
            return None

    # -----------------------------------------------------------------------
    # Timeline operations
    # -----------------------------------------------------------------------

    def save_timeline(self, timeline: List[TimelineEvent]) -> None:
        self.logger.info(f"[SAVE TIMELINE] Saving {len(timeline)} timeline events")
        try:
            with self.lock:
                save_json(
                    [t.model_dump(mode="json") for t in timeline],
                    self.timeline_file
                )
            self.logger.info(f"[SAVE TIMELINE] [OK] {len(timeline)} timeline events persisted to {self.timeline_file}")
        except Exception as e:
            self.logger.error(f"[SAVE TIMELINE] [ERROR] Failed: {e}\n{traceback.format_exc()}")
            raise

    def get_latest_timeline(self) -> List[TimelineEvent]:
        with self.lock:
            data = load_json(self.timeline_file)
            if data and isinstance(data, list):
                try:
                    return [TimelineEvent(**t) for t in data]
                except Exception as e:
                    self.logger.error(f"[DATABASE] Failed to load timeline: {e}")
            return []

    # -----------------------------------------------------------------------
    # Report operations
    # -----------------------------------------------------------------------

    def save_report(self, report: IncidentReport) -> None:
        self.logger.info(f"[SAVE REPORT] Saving report for incident {report.incident.id}")
        try:
            with self.lock:
                save_json(report.model_dump(mode="json"), self.report_file)
            self.logger.info(f"[SAVE REPORT] [OK] Report persisted to {self.report_file}")
        except Exception as e:
            self.logger.error(f"[SAVE REPORT] [ERROR] Failed: {e}\n{traceback.format_exc()}")
            raise

    def get_latest_report(self) -> Optional[IncidentReport]:
        with self.lock:
            data = load_json(self.report_file)
            if data:
                try:
                    return IncidentReport(**data)
                except Exception as e:
                    self.logger.error(f"[DATABASE] Failed to load report: {e}")
            return None

    # -----------------------------------------------------------------------
    # Alert operations
    # -----------------------------------------------------------------------

    def save_alert(self, alert: Alert) -> None:
        self.logger.info(f"[SAVE ALERT] Saving alert for incident {alert.incident_id}")
        try:
            with self.lock:
                self.alerts_cache.append(alert)
                self._save_alerts()
            self.logger.info(f"[SAVE ALERT] [OK] Alert {alert.alert_id} persisted")
        except Exception as e:
            self.logger.error(f"[SAVE ALERT] [ERROR] Failed: {e}\n{traceback.format_exc()}")
            raise

    def get_alerts(self, limit: int = 50) -> List[Alert]:
        with self.lock:
            return list(self.alerts_cache)[-limit:]

    # -----------------------------------------------------------------------
    # Evidence operations
    # -----------------------------------------------------------------------

    def save_evidence(self, evidence_items: List[EvidenceItem]) -> None:
        self.logger.info(f"[SAVE EVIDENCE] Saving {len(evidence_items)} evidence items")
        try:
            with self.lock:
                for ev in evidence_items:
                    self.evidence_cache.append(ev)
                self._save_evidence()
            self.logger.info(f"[SAVE EVIDENCE] [OK] {len(evidence_items)} evidence items persisted")
        except Exception as e:
            self.logger.error(f"[SAVE EVIDENCE] [ERROR] Failed: {e}\n{traceback.format_exc()}")
            raise

    def get_evidence(self, limit: int = 50) -> List[EvidenceItem]:
        with self.lock:
            return list(self.evidence_cache)[-limit:]

    # -----------------------------------------------------------------------
    # Statistics
    # -----------------------------------------------------------------------

    def get_statistics(self) -> Dict[str, Any]:
        """Get database statistics."""
        with self.lock:
            return {
                "total_incidents": len(self.incidents_cache),
                "total_detections": len(self.detections_cache),
                "total_tracks": len(self.tracks_cache),
                "total_events": len(self.events_cache),
                "total_alerts": len(self.alerts_cache),
                "total_evidence": len(self.evidence_cache),
                "storage_path": str(self.data_dir),
                "retention_days": config.database.data_retention_days
            }

    # -----------------------------------------------------------------------
    # Cleanup
    # -----------------------------------------------------------------------

    def cleanup_old_data(self) -> None:
        """Remove data older than retention period."""
        cutoff_date = datetime.now() - timedelta(days=config.database.data_retention_days)

        with self.lock:
            to_remove = [
                inc_id for inc_id, inc in self.incidents_cache.items()
                if inc.timestamp < cutoff_date
            ]
            for inc_id in to_remove:
                del self.incidents_cache[inc_id]

            self.detections_cache.clear()
            self.tracks_cache.clear()
            self.events_cache.clear()

            self._save_incidents()
            self._save_detections()
            self._save_tracks()
            self._save_events()

            self.logger.info(f"[DATABASE] Cleaned up {len(to_remove)} old incidents")


# Global database instance
database = DatabaseManager()
