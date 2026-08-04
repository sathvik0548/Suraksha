"""
Main entry point for Sentinel AI Emergency Response System.
Startup code and server initialization.
"""

import sys
import asyncio
from pathlib import Path

# Add brain directory to path for imports
brain_dir = Path(__file__).parent
sys.path.insert(0, str(brain_dir))

import uvicorn
from config import config
from api import app
from utils import setup_logger


def main():
    """
    Main entry point for the Sentinel AI server.
    Initializes and starts the FastAPI application.
    """
    # Setup logging
    logger = setup_logger("main", config)
    
    logger.info("=" * 60)
    logger.info("SENTINEL AI EMERGENCY RESPONSE SYSTEM")
    logger.info("=" * 60)
    logger.info(f"Python Version: {sys.version}")
    logger.info(f"Working Directory: {Path.cwd()}")
    logger.info(f"Brain Directory: {brain_dir}")
    logger.info(f"API Host: {config.api.host}")
    logger.info(f"API Port: {config.api.port}")
    logger.info(f"Debug Mode: {config.api.debug}")
    logger.info(f"API Version: {app.version}")
    logger.info("=" * 60)
    
    # Print configuration summary
    logger.info("Configuration Summary:")
    logger.info(f"  - Model Device: {config.model.yolo_device}")
    logger.info(f"  - YOLO Confidence Threshold: {config.model.yolo_confidence_threshold}")
    logger.info(f"  - Tracker Type: {config.model.tracker_type}")
    logger.info(f"  - Severity Range: {config.severity.min_severity} - {config.severity.max_severity}")
    logger.info(f"  - Max Upload Size: {config.api.max_upload_size / (1024*1024)}MB")
    logger.info(f"  - Data Retention: {config.database.data_retention_days} days")
    logger.info("=" * 60)
    
    # Check if required directories exist
    logger.info("Checking directories...")
    required_dirs = [
        config.paths.models_dir,
        config.paths.uploads_dir,
        config.paths.outputs_dir,
        config.paths.logs_dir
    ]
    
    for dir_path in required_dirs:
        if dir_path.exists():
            logger.info(f"  [OK] {dir_path.name}: {dir_path}")
        else:
            logger.warning(f"  [ERROR] {dir_path.name}: {dir_path} (will be created)")
    
    logger.info("=" * 60)
    logger.info("Starting Sentinel AI Server...")
    logger.info(f"API Documentation: http://{config.api.host}:{config.api.port}/api/docs")
    logger.info(f"API Redoc: http://{config.api.host}:{config.api.port}/api/redoc")
    logger.info(f"Health Check: http://{config.api.host}:{config.api.port}/health")
    logger.info("=" * 60)
    
    # Run the server
    try:
        uvicorn.run(
            "api:app",
            host=config.api.host,
            port=config.api.port,
            reload=config.api.debug,
            log_level=config.logging.log_level.lower(),
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("Server shutdown requested by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)
    finally:
        logger.info("Sentinel AI Server stopped")


def run_production():
    """
    Run the server in production mode.
    Use this for deployment without auto-reload.
    """
    config.api.debug = False
    
    logger = setup_logger("main", config)
    logger.info("Running in PRODUCTION mode")
    
    uvicorn.run(
        "api:app",
        host=config.api.host,
        port=config.api.port,
        workers=4,
        log_level=config.logging.log_level.lower(),
        access_log=True
    )


def run_development():
    """
    Run the server in development mode with auto-reload.
    Use this for local development.
    """
    config.api.debug = True
    
    logger = setup_logger("main", config)
    logger.info("Running in DEVELOPMENT mode with auto-reload")
    
    uvicorn.run(
        "api:app",
        host=config.api.host,
        port=config.api.port,
        reload=True,
        log_level="debug",
        access_log=True
    )


if __name__ == "__main__":
    main()
