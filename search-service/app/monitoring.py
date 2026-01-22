"""
Monitoring service for the Search Service.

Tracks request metrics, system resources, and provides health data.
"""

import time
import platform
import sys
from datetime import datetime
from typing import Dict, Any
from dataclasses import dataclass, field
from threading import Lock

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


@dataclass
class RequestMetrics:
    """Tracks request-related metrics."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_response_time: float = 0.0
    start_time: float = field(default_factory=time.time)

    @property
    def average_response_time(self) -> float:
        """Average response time in milliseconds."""
        if self.total_requests == 0:
            return 0.0
        return (self.total_response_time / self.total_requests) * 1000

    @property
    def success_rate(self) -> float:
        """Success rate as percentage."""
        if self.total_requests == 0:
            return 100.0
        return (self.successful_requests / self.total_requests) * 100

    def record_request(self, response_time: float, status_code: int) -> None:
        """Record a completed request."""
        self.total_requests += 1
        self.total_response_time += response_time
        if 200 <= status_code < 400:
            self.successful_requests += 1
        else:
            self.failed_requests += 1


class MonitoringService:
    """
    Thread-safe monitoring service tracking application health and performance.
    """

    def __init__(self):
        self._lock = Lock()
        self._start_time = time.time()
        self._request_metrics = RequestMetrics()

    def record_request(self, response_time: float, status_code: int) -> None:
        """Thread-safe request recording."""
        with self._lock:
            self._request_metrics.record_request(response_time, status_code)

    def get_uptime(self) -> float:
        """Server uptime in seconds."""
        return time.time() - self._start_time

    def get_uptime_formatted(self) -> str:
        """Human-readable uptime."""
        uptime = self.get_uptime()
        days = int(uptime // 86400)
        hours = int((uptime % 86400) // 3600)
        minutes = int((uptime % 3600) // 60)
        seconds = int(uptime % 60)

        parts = []
        if days > 0:
            parts.append(f"{days}d")
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0:
            parts.append(f"{minutes}m")
        parts.append(f"{seconds}s")
        return " ".join(parts)

    def get_process_stats(self) -> Dict[str, Any]:
        """Get this process's resource usage. Returns zeros if psutil unavailable."""
        if HAS_PSUTIL:
            try:
                process = psutil.Process()
                cpu_percent = process.cpu_percent(interval=0.1)
                memory_info = process.memory_info()
                memory_mb = memory_info.rss / (1024 * 1024)  # RSS = actual RAM used
                return {
                    "cpu_percent": round(cpu_percent, 2),
                    "memory_mb": round(memory_mb, 2),
                    "psutil_available": True
                }
            except Exception:
                pass

        return {
            "cpu_percent": 0.0,
            "memory_mb": 0.0,
            "psutil_available": False
        }

    def get_environment_info(self) -> Dict[str, str]:
        """Get runtime environment information."""
        return {
            "python_version": sys.version.split()[0],
            "platform": platform.system(),
            "platform_version": platform.version(),
            "architecture": platform.machine()
        }

    def get_health_data(self) -> Dict[str, Any]:
        """Get comprehensive health data for monitoring."""
        with self._lock:
            metrics = self._request_metrics

        process_stats = self.get_process_stats()
        env_info = self.get_environment_info()

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "healthy",
            "uptime_seconds": round(self.get_uptime(), 2),
            "uptime_formatted": self.get_uptime_formatted(),
            "requests": {
                "total": metrics.total_requests,
                "successful": metrics.successful_requests,
                "failed": metrics.failed_requests,
                "success_rate": round(metrics.success_rate, 2),
                "average_response_time_ms": round(metrics.average_response_time, 2)
            },
            "process": {
                "cpu_percent": process_stats["cpu_percent"],
                "memory_mb": process_stats["memory_mb"],
                "psutil_available": process_stats["psutil_available"]
            },
            "environment": env_info
        }


class MonitoringMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware that tracks request metrics."""

    def __init__(self, app, monitoring_service: MonitoringService):
        super().__init__(app)
        self.monitoring_service = monitoring_service

    async def dispatch(self, request: Request, call_next) -> Response:
        """Record request metrics for each request."""
        start_time = time.time()
        try:
            response = await call_next(request)
            self.monitoring_service.record_request(
                time.time() - start_time, 
                response.status_code
            )
            return response
        except Exception as e:
            self.monitoring_service.record_request(time.time() - start_time, 500)
            raise


# Global instance
monitoring_service = MonitoringService()
