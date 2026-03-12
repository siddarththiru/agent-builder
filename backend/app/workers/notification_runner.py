import logging
import signal
import sys
import time
from typing import List

from sqlmodel import Session, create_engine

from app.config.notifications import get_notification_settings
from app.database import get_db_url
from app.workers.notification_channels import (
    ConsoleNotificationChannel,
    NotificationChannel,
    NotificationDispatcher,
    WebhookNotificationChannel,
)
from app.workers.notification_worker import NotificationWorker

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.settings = get_notification_settings()
        self.engine = create_engine(get_db_url(), echo=False, connect_args={"check_same_thread": False})
        self.running = False

    def _build_channels(self) -> List[NotificationChannel]:
        channels: List[NotificationChannel] = [ConsoleNotificationChannel()]

        if self.settings.notification_webhook_url:
            channels.append(WebhookNotificationChannel(self.settings.notification_webhook_url))

        return channels

    def run(self) -> None:
        if not self.settings.notifications_enabled:
            logger.info("Notifications disabled; exiting notification worker")
            return

        self.running = True
        channels = self._build_channels()
        dispatcher = NotificationDispatcher(channels)

        logger.info("Starting notification worker with %s channel(s)", len(channels))

        try:
            with Session(self.engine) as db_session:
                worker = NotificationWorker(db_session, dispatcher, self.settings)
                while self.running:
                    stats = worker.poll_once()
                    logger.info(
                        "Notification poll complete: processed=%s alerts_sent=%s",
                        stats["processed_logs"],
                        stats["alerts_sent"],
                    )
                    time.sleep(self.settings.alert_poll_interval)
        except KeyboardInterrupt:
            logger.info("Notification worker interrupted")
        except (OSError, ValueError, TypeError, RuntimeError) as exc:
            logger.error("Notification worker fatal error: %s", exc, exc_info=True)
            sys.exit(1)
        finally:
            self.engine.dispose()

    def shutdown(self, signum=None, _frame=None) -> None:
        logger.info("Received signal %s", signum)
        self.running = False

def start_notification_worker() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    service = NotificationService()
    signal.signal(signal.SIGINT, service.shutdown)
    signal.signal(signal.SIGTERM, service.shutdown)
    service.run()


if __name__ == "__main__":
    start_notification_worker()
