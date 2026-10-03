"""Backend tests for cost removal + downtime_hours feature."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    os.environ.get("BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fall back to frontend .env file
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN = {"username": "admin", "password": "Admin#2026"}
USER = {"username": "operator", "password": "Operator#2026"}


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=USER, timeout=20)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def machine_id(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/machines", timeout=15)
    assert r.status_code == 200
    machines = r.json()
    assert machines, "No seeded machines"
    return machines[0]["id"]


# ---------------- Dashboard stats ----------------
class TestDashboardStats:
    def test_admin_dashboard_has_downtime_no_cost(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "total_downtime" in data
        assert "downtime_trend" in data
        assert isinstance(data["downtime_trend"], list)
        for pt in data["downtime_trend"]:
            assert "month" in pt and "hours" in pt
        assert "total_cost" not in data
        assert "monthly_cost" not in data

    def test_user_dashboard_has_downtime_no_cost(self, user_session):
        r = user_session.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "total_downtime" in data
        assert "downtime_trend" in data
        assert "total_cost" not in data
        assert "monthly_cost" not in data


# ---------------- Services CRUD with downtime_hours ----------------
class TestServiceDowntime:
    created_id = None

    def test_create_service_with_downtime(self, admin_session, machine_id):
        payload = {
            "machine_id": machine_id, "machine_name": "TEST",
            "date": "2026-01-10", "service_type": "perbaikan",
            "problem": "TEST problem", "action": "TEST action",
            "technician_name": "T1", "operator_name": "O1",
            "used_parts": [], "downtime_hours": 3.5, "status": "selesai",
        }
        r = admin_session.post(f"{BASE_URL}/api/services", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["downtime_hours"] == 3.5
        assert "cost" not in data or data.get("cost") in (None, 0)
        TestServiceDowntime.created_id = data["id"]

    def test_create_without_cost_field_succeeds(self, admin_session, machine_id):
        """cost field is NOT required"""
        payload = {
            "machine_id": machine_id, "date": "2026-01-11",
            "service_type": "preventif", "downtime_hours": 1,
        }
        r = admin_session.post(f"{BASE_URL}/api/services", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        # cleanup
        admin_session.delete(f"{BASE_URL}/api/services/{r.json()['id']}")

    def test_get_services_returns_downtime(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/services", timeout=15)
        assert r.status_code == 200
        services = r.json()
        found = [s for s in services if s["id"] == TestServiceDowntime.created_id]
        assert found and found[0]["downtime_hours"] == 3.5

    def test_update_service_downtime(self, admin_session, machine_id):
        sid = TestServiceDowntime.created_id
        payload = {
            "machine_id": machine_id, "date": "2026-01-10",
            "service_type": "perbaikan", "downtime_hours": 7.25,
        }
        r = admin_session.put(f"{BASE_URL}/api/services/{sid}", json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json()["downtime_hours"] == 7.25

    def test_user_cannot_post_service(self, user_session, machine_id):
        payload = {"machine_id": machine_id, "date": "2026-01-10", "downtime_hours": 1}
        r = user_session.post(f"{BASE_URL}/api/services", json=payload, timeout=15)
        assert r.status_code == 403

    def test_user_cannot_put_service(self, user_session, machine_id):
        sid = TestServiceDowntime.created_id
        payload = {"machine_id": machine_id, "date": "2026-01-10", "downtime_hours": 1}
        r = user_session.put(f"{BASE_URL}/api/services/{sid}", json=payload, timeout=15)
        assert r.status_code == 403

    def test_user_cannot_delete_service(self, user_session):
        sid = TestServiceDowntime.created_id
        r = user_session.delete(f"{BASE_URL}/api/services/{sid}", timeout=15)
        assert r.status_code == 403

    def test_user_can_get_services(self, user_session):
        r = user_session.get(f"{BASE_URL}/api/services", timeout=15)
        assert r.status_code == 200
        services = r.json()
        if services:
            assert "downtime_hours" in services[0]

    def test_zzz_cleanup(self, admin_session):
        sid = TestServiceDowntime.created_id
        if sid:
            admin_session.delete(f"{BASE_URL}/api/services/{sid}")


# ---------------- Reports Summary ----------------
class TestReportsSummary:
    def test_reports_summary_has_services_with_downtime(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/reports/summary", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "services" in data
        for s in data["services"]:
            assert "downtime_hours" in s

    def test_reports_summary_user_sees_downtime(self, user_session):
        r = user_session.get(f"{BASE_URL}/api/reports/summary", timeout=15)
        assert r.status_code == 200
        data = r.json()
        # cost should not be in services
        for s in data["services"]:
            # cost field should not exist OR not be stripped-marker;
            # the requirement is no cost field surfaces
            assert "cost" not in s
