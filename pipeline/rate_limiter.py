"""
Token-bucket rate limiter for Gemini API calls.
Target: 130 RPM (Tier 1 safe margin).
"""

import time
import threading

MAX_TOKENS = 130
REFILL_INTERVAL = 60.0  # seconds

_lock = threading.Lock()
_tokens = MAX_TOKENS
_last_refill = time.monotonic()


def _refill() -> None:
    global _tokens, _last_refill
    now = time.monotonic()
    elapsed = now - _last_refill
    if elapsed >= REFILL_INTERVAL:
        _tokens = MAX_TOKENS
        _last_refill = now
    else:
        new_tokens = int((elapsed / REFILL_INTERVAL) * MAX_TOKENS)
        _tokens = min(MAX_TOKENS, _tokens + new_tokens)
        _last_refill = now


def acquire_token() -> None:
    """Block until a rate-limit token is available."""
    global _tokens
    while True:
        with _lock:
            _refill()
            if _tokens > 0:
                _tokens -= 1
                return
        wait_ms = REFILL_INTERVAL / MAX_TOKENS
        time.sleep(wait_ms)
