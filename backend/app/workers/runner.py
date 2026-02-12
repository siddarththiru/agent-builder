import argparse
import asyncio
import json
import logging
import signal
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlmodel import create_engine, Session

from app.workers.threat_classifier import ThreatClassificationWorker
from app.workers.mcp_client import MCPClient

logger = logging.getLogger(__name__)

def setup_logging(level: int = logging.INFO):
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("threat_classifier.log"),
        ],
    )

class WorkerConfig:    
    def __init__(
        self,
        database_url: str = "sqlite:///app.db",
        mcp_url: str = "http://localhost:11434/",
        polling_interval_minutes: int = 15,
        log_level: str = "INFO",
    ):
        self.database_url = database_url
        self.mcp_url = mcp_url
        self.polling_interval_minutes = polling_interval_minutes
        self.log_level = log_level
    
    @classmethod
    def from_file(cls, config_path: str) -> "WorkerConfig":
        with open(config_path) as f:
            data = json.load(f)
        return cls(**data)
    
    @classmethod
    def from_env(cls) -> "WorkerConfig":
        import os
        
        return cls(
            database_url=os.getenv("DATABASE_URL", "sqlite:///app.db"),
            mcp_url=os.getenv("MCP_URL", "http://localhost:11434"),
            polling_interval_minutes=int(os.getenv("POLLING_INTERVAL_MINUTES", "15")),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )


class ThreatClassifierService:
    def __init__(self, config: WorkerConfig):
        self.config = config
        self.engine = create_engine(config.database_url, echo=False)
        self.mcp_client: Optional[MCPClient] = None
        self.worker: Optional[ThreatClassificationWorker] = None
        self.running = False
    
    def initialize(self):
        logger.info("Initializing Threat Classification Worker...")

        logger.info(f"Connecting to MCP at {self.config.mcp_url}...")
        self.mcp_client = MCPClient(self.config.mcp_url)
        if self.mcp_client.health_check():
            logger.info("MCP server is healthy")
        else:
            raise RuntimeError("MCP server not responding")
        
        # Create worker
        with Session(self.engine) as session:
            self.worker = ThreatClassificationWorker(session, self.mcp_client)
            self.worker.POLLING_INTERVAL_MINUTES = self.config.polling_interval_minutes
        
        logger.info("Worker initialized successfully")
    
    def run(self):
        logger.info("Starting threat classification worker...")
        self.running = True
        iterations = 0
        
        try:
            while self.running:
                iterations += 1
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                logger.info(f"[{timestamp}] Poll iteration {iterations}")
                
                try:
                    with Session(self.engine) as session:
                        worker = ThreatClassificationWorker(session, self.mcp_client)
                        worker.POLLING_INTERVAL_MINUTES = self.config.polling_interval_minutes
                        
                        stats = worker.poll_and_classify()
                        
                        logger.info(
                            f"Poll complete: "
                            f"found={stats['sessions_found']}, "
                            f"classified={stats['sessions_classified']}, "
                            f"errors={stats['errors']}"
                        )
                except Exception as e:
                    logger.error(f"Error in poll cycle: {e}", exc_info=True)
                
                # Sleep before next poll
                sleep_seconds = self.config.polling_interval_minutes * 60
                logger.info(f"Sleeping for {self.config.polling_interval_minutes} minutes...")
                time.sleep(sleep_seconds)
        
        except KeyboardInterrupt:
            logger.info("Worker interrupted by user")
        except Exception as e:
            logger.error(f"Fatal error: {e}", exc_info=True)
            sys.exit(1)
        finally:
            self.cleanup()
    
    def cleanup(self):
        logger.info("Cleaning up...")
        if self.mcp_client:
            self.mcp_client.close()
        if self.engine:
            self.engine.dispose()
        logger.info("Shutdown complete")
    
    def shutdown(self, signum=None, frame=None):
        logger.info(f"Received signal {signum}")
        self.running = False

def start_worker(
    database_url: str = "sqlite:///app.db",
    mcp_url: str = "http://localhost:3000",
    polling_interval_minutes: int = 15,
):
    config = WorkerConfig(
        database_url=database_url,
        mcp_url=mcp_url,
        polling_interval_minutes=polling_interval_minutes,
    )
    
    setup_logging(level=logging.INFO)
    
    service = ThreatClassifierService(config)
    service.initialize()
    
    # Install signal handlers
    signal.signal(signal.SIGINT, service.shutdown)
    signal.signal(signal.SIGTERM, service.shutdown)
    
    service.run()

def main():
    parser = argparse.ArgumentParser(
        description="Threat Classification Worker - MCP-powered offline analysis"
    )
    parser.add_argument(
        "--config",
        type=str,
        help="Configuration file (JSON)",
    )
    parser.add_argument(
        "--database-url",
        type=str,
        default="sqlite:///app.db",
        help="Database URL",
    )
    parser.add_argument(
        "--mcp-url",
        type=str,
        default="http://localhost:3000",
        help="MCP server URL",
    )
    parser.add_argument(
        "--polling-interval",
        type=int,
        default=15,
        help="Polling interval in minutes",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose logging",
    )
    
    args = parser.parse_args()
    
    # Load config
    if args.config:
        logger.info(f"Loading configuration from {args.config}")
        config = WorkerConfig.from_file(args.config)
    else:
        config = WorkerConfig(
            database_url=args.database_url,
            mcp_url=args.mcp_url,
            polling_interval_minutes=args.polling_interval,
            log_level="DEBUG" if args.verbose else "INFO",
        )
    
    setup_logging(
        level=logging.DEBUG if args.verbose else logging.INFO
    )
    
    logger.info("=" * 80)
    logger.info("Threat Classification Worker Starting")
    logger.info("=" * 80)
    logger.info(f"Database: {config.database_url}")
    logger.info(f"MCP URL: {config.mcp_url}")
    logger.info(f"Polling interval: {config.polling_interval_minutes} minutes")
    logger.info("=" * 80)
    
    service = ThreatClassifierService(config)
    service.initialize()
    
    # Install signal handlers
    signal.signal(signal.SIGINT, service.shutdown)
    signal.signal(signal.SIGTERM, service.shutdown)
    
    service.run()

if __name__ == "__main__":
    main()
