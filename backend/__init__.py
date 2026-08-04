"""
Sentinel AI Emergency Response System - Brain Module
Production-grade AI backend for smart city emergency command center.
"""

__version__ = "1.0.0"
__author__ = "Sentinel AI Team"

from config import config
from schemas import *
from database import database
from detector import VideoDetector
from tracker import ObjectTracker
from event_buffer import EventBuffer
from coordinator import IncidentCoordinator
from severity import SeverityAnalyzer
from reasoning import ReasoningEngine
from timeline import TimelineGenerator
from report import ReportGenerator
from integration import frontend_integration

__all__ = [
    "config",
    "database",
    "VideoDetector",
    "ObjectTracker",
    "EventBuffer",
    "IncidentCoordinator",
    "SeverityAnalyzer",
    "ReasoningEngine",
    "TimelineGenerator",
    "ReportGenerator",
    "frontend_integration"
]
