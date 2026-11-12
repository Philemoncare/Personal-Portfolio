"""Small in-process sliding-window rate limiter.

Suitable for the single API instance used in the first phase. If the API is
scaled horizontally, move the counters to Redis and keep this interface.
"""

import threading
import time
from collections import deque


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._last_prune = time.monotonic()

    def hit(self, key: str) -> tuple[bool, int]:
        """Record a hit. Returns (allowed, retry_after_seconds)."""
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            self._prune(now)
            bucket = self._hits.setdefault(key, deque())
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            if len(bucket) >= self.limit:
                retry_after = max(1, int(bucket[0] + self.window_seconds - now))
                return False, retry_after

            bucket.append(now)
            return True, 0

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)

    def _prune(self, now: float) -> None:
        # Avoid unbounded growth from one-off IPs.
        if now - self._last_prune < self.window_seconds:
            return
        cutoff = now - self.window_seconds
        for key in list(self._hits):
            bucket = self._hits[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if not bucket:
                del self._hits[key]
        self._last_prune = now
