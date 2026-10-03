"""Backend tests for /api/dashboard/downtime (DOWNTIME MONITOR) endpoint."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"username": "admin", "password": "Admin#2026"})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def operator_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"username": "operator", "password": "Operator#2026"})
    assert r.status_code == 200, r.text
    return s


def test_downtime_daily_default(admin_session):
    r = admin_session.get(f"{API}/dashboard/downtime", params={"days": 30, "bucket": "daily"})
    assert r.status_code == 200
    data = r.json()
    for k in ["curve", "per_machine", "repair_history", "total_downtime", "total_used"]:
        assert k in data
    assert 28 <= len(data["curve"]) <= 31
    if data["curve"]:
        c0 = data["curve"][0]
        assert {"label", "downtime", "used"}.issubset(c0.keys())


def test_downtime_weekly_fewer_buckets(admin_session):
    r = admin_session.get(f"{API}/dashboard/downtime", params={"days": 30, "bucket": "weekly"})
    assert r.status_code == 200
    data = r.json()
    assert 1 <= len(data["curve"]) <= 7


def test_downtime_monthly_fewer_buckets(admin_session):
    r = admin_session.get(f"{API}/dashboard/downtime", params={"days": 30, "bucket": "monthly"})
    assert r.status_code == 200
    data = r.json()
    assert 1 <= len(data["curve"]) <= 3


def test_downtime_7_days(admin_session):
    r = admin_session.get(f"{API}/dashboard/downtime", params={"days": 7, "bucket": "daily"})
    assert r.status_code == 200
    data = r.json()
    assert 6 <= len(data["curve"]) <= 8


def test_downtime_90_days(admin_session):
    r = admin_session.get(f"{API}/dashboard/downtime", params={"days": 90, "bucket": "daily"})
    assert r.status_code == 200
    data = r.json()
    assert 88 <= len(data["curve"]) <= 91


def test_per_machine_populated_and_sorted(admin_session):
    r = admin_session.get(f"{API}/dashboard/downtime", params={"days": 30, "bucket": "daily"})
    data = r.json()
    pm = data["per_machine"]
    hours = [m["hours"] for m in pm]
    assert hours == sorted(hours, reverse=True)
    for m in pm:
        assert "machine" in m and "hours" in m
        assert m["hours"] > 0


def test_machine_filter_restricts_curve_and_history_not_permachine(admin_session):
    r = admin_session.get(f"{API}/dashboard/downtime", params={"days": 30, "bucket": "daily"})
    data = r.json()
    hist = data["repair_history"]
    if not hist:
        pytest.skip("no repair history")
    mid = next((h["machine_id"] for h in hist if h.get("machine_id")), None)
    if not mid:
        pytest.skip("no machine_id in history")

    r2 = admin_session.get(f"{API}/dashboard/downtime",
                           params={"days": 30, "bucket": "daily", "machine_id": mid})
    assert r2.status_code == 200
    d2 = r2.json()
    for h in d2["repair_history"]:
        assert h["machine_id"] == mid
    # per_machine should NOT be filtered
    assert len(d2["per_machine"]) == len(data["per_machine"])


def test_totals_consistent_with_curve(admin_session):
    r = admin_session.get(f"{API}/dashboard/downtime", params={"days": 30, "bucket": "daily"})
    data = r.json()
    curve_sum_dt = round(sum(c["downtime"] for c in data["curve"]), 1)
    curve_sum_used = round(sum(c["used"] for c in data["curve"]), 1)
    assert abs(curve_sum_dt - data["total_downtime"]) < 0.5
    assert abs(curve_sum_used - data["total_used"]) < 0.5


def test_operator_can_read(operator_session):
    r = operator_session.get(f"{API}/dashboard/downtime", params={"days": 30, "bucket": "daily"})
    assert r.status_code == 200
    data = r.json()
    assert "curve" in data and "per_machine" in data


def test_unauthenticated_rejected():
    r = requests.get(f"{API}/dashboard/downtime", params={"days": 30})
    assert r.status_code in (401, 403)
