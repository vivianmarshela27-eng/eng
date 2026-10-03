"""Backend tests for downtime analytics, repair durations, and preventive-by-type."""
import os
import pytest
import requests

BASE_URL = ""
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
def machine(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/machines", timeout=15)
    assert r.status_code == 200
    machines = r.json()
    assert machines
    return machines[0]


# ----- auto-compute durations -----
class TestDurationComputation:
    created = []

    def test_create_service_computes_durations(self, admin_session, machine):
        payload = {
            "machine_id": machine["id"], "machine_name": machine["name"],
            "date": "2026-06-02", "service_type": "perbaikan",
            "problem": "TEST problem", "action": "TEST action",
            "technician_name": "T1", "operator_name": "O1",
            "repair_start": "2026-06-02T08:00",
            "repair_end": "2026-06-02T11:30",
            "downtime_start": "2026-06-02T07:30",
            "downtime_end": "2026-06-02T13:00",
            "status": "selesai",
        }
        r = admin_session.post(f"{BASE_URL}/api/services", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["repair_duration_hours"] == 3.5, data
        assert data["downtime_hours"] == 5.5, data
        assert data["repair_start"] == "2026-06-02T08:00"
        assert data["repair_end"] == "2026-06-02T11:30"
        TestDurationComputation.created.append(data["id"])

    def test_get_service_persists_fields(self, admin_session):
        sid = TestDurationComputation.created[0]
        r = admin_session.get(f"{BASE_URL}/api/services", timeout=15)
        assert r.status_code == 200
        row = next((s for s in r.json() if s["id"] == sid), None)
        assert row is not None
        assert row["repair_duration_hours"] == 3.5
        assert row["downtime_hours"] == 5.5
        assert row.get("repair_start") == "2026-06-02T08:00"
        assert row.get("downtime_end") == "2026-06-02T13:00"

    def test_update_recomputes_durations(self, admin_session, machine):
        sid = TestDurationComputation.created[0]
        payload = {
            "machine_id": machine["id"], "machine_name": machine["name"],
            "date": "2026-06-02", "service_type": "perbaikan",
            "problem": "TEST", "action": "TEST",
            "repair_start": "2026-06-02T09:00",
            "repair_end": "2026-06-02T10:15",
            "downtime_start": "2026-06-02T09:00",
            "downtime_end": "2026-06-02T11:00",
            "status": "selesai",
        }
        r = admin_session.put(f"{BASE_URL}/api/services/{sid}", json=payload, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["repair_duration_hours"] == 1.25
        assert data["downtime_hours"] == 2.0


# ----- dashboard analytics -----
class TestDashboardAnalytics:
    def test_dashboard_has_new_fields(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for key in ("downtime_by_machine", "downtime_by_machine_month",
                    "downtime_machine_series", "repair_history"):
            assert key in d, f"missing key {key}"
        assert isinstance(d["downtime_by_machine"], list)
        # sorted desc by hours
        hours = [x["hours"] for x in d["downtime_by_machine"]]
        assert hours == sorted(hours, reverse=True)
        for x in d["downtime_by_machine"]:
            assert "machine" in x and "hours" in x
        for row in d["downtime_by_machine_month"]:
            assert "month" in row

    def test_repair_history_contains_test_service(self, admin_session):
        sid = TestDurationComputation.created[0] if TestDurationComputation.created else None
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
        d = r.json()
        rh = d["repair_history"]
        if sid:
            match = next((x for x in rh if x["id"] == sid), None)
            assert match is not None, "test service missing from repair_history"
            assert match["service_type"] == "perbaikan"
            assert match["repair_duration_hours"] == 1.25
            assert match["downtime_hours"] == 2.0
            assert "problem" in match

    def test_user_can_access_dashboard(self, user_session):
        r = user_session.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
        assert r.status_code == 200
        assert "repair_history" in r.json()


# ----- reports preventive_by_type -----
class TestReportsPreventiveByType:
    def test_preventive_by_type_present(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/reports/summary", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "preventive_by_type" in d
        assert isinstance(d["preventive_by_type"], list)
        for row in d["preventive_by_type"]:
            assert "type" in row and "count" in row
            assert isinstance(row["count"], int)

    def test_preventive_by_type_user_accessible(self, user_session):
        r = user_session.get(f"{BASE_URL}/api/reports/summary", timeout=15)
        assert r.status_code == 200
        assert "preventive_by_type" in r.json()


# ----- role gating -----
class TestRoleGating:
    def test_user_post_forbidden(self, user_session, machine):
        r = user_session.post(f"{BASE_URL}/api/services",
                              json={"machine_id": machine["id"], "date": "2026-01-01"}, timeout=15)
        assert r.status_code == 403

    def test_user_put_forbidden(self, user_session, machine):
        sid = TestDurationComputation.created[0] if TestDurationComputation.created else "x"
        r = user_session.put(f"{BASE_URL}/api/services/{sid}",
                             json={"machine_id": machine["id"], "date": "2026-01-01"}, timeout=15)
        assert r.status_code == 403

    def test_user_delete_forbidden(self, user_session):
        sid = TestDurationComputation.created[0] if TestDurationComputation.created else "x"
        r = user_session.delete(f"{BASE_URL}/api/services/{sid}", timeout=15)
        assert r.status_code == 403


# ----- cleanup -----
class TestCleanup:
    def test_zzz_cleanup(self, admin_session):
        for sid in TestDurationComputation.created:
            admin_session.delete(f"{BASE_URL}/api/services/{sid}", timeout=15)
