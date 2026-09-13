import pytest

from app.rate_limit import reset_rate_limits


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """
    Every test starts with a clean rate-limit counter.

    TestClient requests all share the same client address, so without this a
    test suite that calls a rate-limited endpoint (register/login/bookings)
    more than a few times fails with 429s that have nothing to do with the
    behaviour under test.
    """
    reset_rate_limits()
    yield
    reset_rate_limits()
