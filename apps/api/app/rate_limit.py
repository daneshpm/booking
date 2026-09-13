"""
Fixed-window rate limiter for the FastAPI service.

Mirrors apps/web/lib/rate-limit.ts so both services enforce the same kind of
abuse protection: Redis-backed (shared with the Next.js app, and therefore
consistent across every instance behind a load balancer) with a bounded
in-memory fallback so a request is never blocked or crashed by a Redis outage.

The key is derived from a client-supplied header (X-Forwarded-For), so an
attacker can rotate it and evade the count. The in-memory map is therefore
hard-capped: without a ceiling, key rotation would turn this into a
memory-exhaustion vector rather than a defence. Treat this as a strong
deterrent against ordinary abuse, not as an authentication boundary.
"""

import time
from dataclasses import dataclass
from typing import Optional

import redis.asyncio as redis_asyncio
from fastapi import Request

from app.config import settings

MAX_TRACKED_KEYS = 20_000
EVICTION_BATCH = 2_000

RECONNECT_BACKOFF_SECONDS = 30


@dataclass
class RateLimitResult:
    allowed: bool
    remaining: int
    retry_after_seconds: Optional[int] = None


@dataclass
class _Window:
    count: int
    reset_at: float


_buckets: dict[str, _Window] = {}

_redis_client: Optional[redis_asyncio.Redis] = None
_retry_connection_after: float = 0.0


def _evict_expired(now: float) -> int:
    expired = [key for key, window in _buckets.items() if window.reset_at <= now]
    for key in expired:
        del _buckets[key]
    return len(_buckets)


def _enforce_ceiling(now: float) -> None:
    if len(_buckets) < MAX_TRACKED_KEYS:
        return
    if _evict_expired(now) < MAX_TRACKED_KEYS:
        return

    # Evict whatever expires soonest rather than whatever was inserted first,
    # so an attacker rotating their forwarded address can't push out a
    # per-account counter that still has real time left on it.
    by_expiry = sorted(_buckets.items(), key=lambda item: item[1].reset_at)
    target = max(len(_buckets) - MAX_TRACKED_KEYS + 1, EVICTION_BATCH)
    for key, _ in by_expiry[:target]:
        del _buckets[key]


def _check_in_memory(key: str, limit: int, window_seconds: int) -> RateLimitResult:
    now = time.monotonic()
    existing = _buckets.get(key)

    if existing is None or existing.reset_at <= now:
        if existing is None:
            _enforce_ceiling(now)
        _buckets[key] = _Window(count=1, reset_at=now + window_seconds)
        return RateLimitResult(allowed=True, remaining=limit - 1)

    if existing.count >= limit:
        return RateLimitResult(
            allowed=False,
            remaining=0,
            retry_after_seconds=max(1, int(existing.reset_at - now)),
        )

    existing.count += 1
    return RateLimitResult(allowed=True, remaining=limit - existing.count)


async def _get_redis() -> Optional[redis_asyncio.Redis]:
    global _redis_client, _retry_connection_after

    if _redis_client is not None:
        return _redis_client

    url = getattr(settings, "REDIS_URL", None)
    if not url:
        return None

    # A blip at boot must not downgrade the instance to per-process limits for
    # the rest of its life, so failures back off rather than latching.
    if time.monotonic() < _retry_connection_after:
        return None

    try:
        client = redis_asyncio.from_url(url, socket_connect_timeout=3, socket_timeout=3)
        await client.ping()
        _redis_client = client
        return client
    except Exception as err:  # noqa: BLE001 - any connection failure degrades gracefully
        print(f"Rate limiter could not reach Redis, using per-instance limits for now: {err}")
        _retry_connection_after = time.monotonic() + RECONNECT_BACKOFF_SECONDS
        return None


async def _check_redis(client: redis_asyncio.Redis, key: str, limit: int, window_seconds: int) -> RateLimitResult:
    namespaced = f"ratelimit:{key}"

    async with client.pipeline(transaction=True) as pipe:
        pipe.incr(namespaced)
        pipe.expire(namespaced, window_seconds, nx=True)
        pipe.ttl(namespaced)
        count, _, ttl = await pipe.execute()

    remaining_ttl = ttl if isinstance(ttl, int) and ttl > 0 else window_seconds

    if count > limit:
        return RateLimitResult(allowed=False, remaining=0, retry_after_seconds=remaining_ttl)

    return RateLimitResult(allowed=True, remaining=max(0, limit - count))


async def check_rate_limit(key: str, limit: int, window_seconds: int) -> RateLimitResult:
    """Record one request against `key` and report whether it is allowed."""
    client = await _get_redis()
    if client is None:
        return _check_in_memory(key, limit, window_seconds)

    try:
        return await _check_redis(client, key, limit, window_seconds)
    except Exception as err:  # noqa: BLE001 - a Redis hiccup must not fail the request
        print(f"Rate limiter Redis command failed, using per-instance limits: {err}")
        return _check_in_memory(key, limit, window_seconds)


def reset_rate_limits() -> None:
    """
    Clear every in-memory counter. Used by tests.

    TestClient requests all share the same client address, so a test suite
    that calls a rate-limited endpoint several times exhausts the same limit a
    real caller would hit in production. Redis is not cleared here: nothing in
    this test suite sets REDIS_URL, so the in-memory path is always what is
    actually exercised.
    """
    _buckets.clear()


def caller_address(request: Request) -> str:
    """Best-effort client address, matching the Next.js app's header precedence."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    return request.client.host if request.client else "unknown"


# Mirrors apps/web/lib/rate-limit.ts's LOGIN_LIMIT / LOGIN_PER_ACCOUNT_LIMIT /
# SIGNUP_LIMIT / PUBLIC_BOOKING_LIMIT so both services apply the same policy.
LOGIN_LIMIT = (10, 15 * 60)
LOGIN_PER_ACCOUNT_LIMIT = (10, 15 * 60)
SIGNUP_LIMIT = (5, 60 * 60)
PUBLIC_BOOKING_LIMIT = (10, 60 * 60)
