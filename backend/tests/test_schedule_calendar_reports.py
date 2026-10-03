"""Backend tests for Schedule 'color' field + Reports preventive statistics."""
import os
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
# fallback to frontend/.env if not in env
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for ln in f:
            if ln.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = ln.split('=', 1)[1].strip().rstrip('/')
                break

ADMIN = {"username": "admin", "password": "Admin#2026"}
USER = {"username": "operator", "password": "Operator#2026"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def user():
    return _login(USER)


@pytest.fixture(scope="module")
def machine_id(admin):
    r = admin.get(f"{BASE_URL}/api/machines", timeout=20)
    assert r.status_code == 200
    items = r.json()
    assert items, "No machines available for test"
    return items[0]["id"]


# ---------------- Schedules color field ----------------
class TestScheduleColor:
    created_ids = []

    def test_create_with_color(self, admin, machine_id):
        payload = {
            "machine_id": machine_id, "machine_name": "TEST_CAL_M",
            "maintenance_type": "TEST_color_create", "due_date": "2026-01-15",
            "frequency": "bulanan", "color": "#E11D48",
        }
        r = admin.post(f"{BASE_URL}/api/schedules", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["color"] == "#E11D48"
        assert "id" in data
        TestScheduleColor.created_ids.append(data["id"])
        # verify persisted via GET
        g = admin.get(f"{BASE_URL}/api/schedules", timeout=20)
        hit = next((x for x in g.json() if x["id"] == data["id"]), None)
        assert hit and hit["color"] == "#E11D48"

    def test_create_without_color_defaults_blue(self, admin, machine_id):
        payload = {
            "machine_id": machine_id, "machine_name": "TEST_CAL_M",
            "maintenance_type": "TEST_color_default", "due_date": "2026-01-20",
            "frequency": "bulanan",
        }
        r = admin.post(f"{BASE_URL}/api/schedules", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["color"] == "#0284C7"
        TestScheduleColor.created_ids.append(data["id"])

    def test_update_color_persists(self, admin, machine_id):
        sid = TestScheduleColor.created_ids[0]
        payload = {
            "machine_id": machine_id, "machine_name": "TEST_CAL_M",
            "maintenance_type": "TEST_color_updated", "due_date": "2026-01-15",
            "frequency": "bulanan", "color": "#059669",
        }
        r = admin.put(f"{BASE_URL}/api/schedules/{sid}", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["color"] == "#059669"
        g = admin.get(f"{BASE_URL}/api/schedules", timeout=20)
        hit = next((x for x in g.json() if x["id"] == sid), None)
        assert hit["color"] == "#059669"
        assert hit["maintenance_type"] == "TEST_color_updated"

    def test_user_cannot_create_schedule(self, user, machine_id):
        payload = {
            "machine_id": machine_id, "maintenance_type": "x",
            "due_date": "2026-01-25", "frequency": "bulanan",
        }
        r = user.post(f"{BASE_URL}/api/schedules", json=payload, timeout=20)
        assert r.status_code == 403

    def test_user_cannot_update(self, user, machine_id):
        if not TestScheduleColor.created_ids:
            pytest.skip()
        sid = TestScheduleColor.created_ids[0]
        payload = {"machine_id": machine_id, "maintenance_type": "x",
                   "due_date": "2026-01-15", "frequency": "bulanan"}
        r = user.put(f"{BASE_URL}/api/schedules/{sid}", json=payload, timeout=20)
        assert r.status_code == 403

    def test_user_cannot_delete(self, user):
        if not TestScheduleColor.created_ids:
            pytest.skip()
        r = user.delete(f"{BASE_URL}/api/schedules/{TestScheduleColor.created_ids[0]}", timeout=20)
        assert r.status_code == 403

    def test_cleanup(self, admin):
        for sid in TestScheduleColor.created_ids:
            r = admin.delete(f"{BASE_URL}/api/schedules/{sid}", timeout=20)
            assert r.status_code == 200


# ---------------- Reports preventive summary ----------------
class TestReportsPreventive:
    def test_admin_summary_has_preventive(self, admin):
        r = admin.get(f"{BASE_URL}/api/reports/summary", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "preventive" in data
        assert "preventive_history" in data
        p = data["preventive"]
        for k in ("total_checksheets", "total_schedules", "with_issues",
                  "total_items", "total_ok", "total_not_ok"):
            assert k in p, f"missing {k}"
            assert isinstance(p[k], int)
        assert p["total_schedules"] >= 0
        assert isinstance(data["preventive_history"], list)

    def test_preventive_history_entry_shape(self, admin):
        r = admin.get(f"{BASE_URL}/api/reports/summary", timeout=20)
        hist = r.json()["preventive_history"]
        if not hist:
            pytest.skip("No filled checksheets to validate shape")
        e = hist[0]
        for k in ("ok", "not_ok", "operator_name", "technician_name", "note",
                  "machine_name", "maintenance_type", "due_date"):
            assert k in e, f"missing {k} in history entry"
        assert isinstance(e["ok"], int)
        assert isinstance(e["not_ok"], int)

    def test_user_summary_has_preventive_but_no_cost(self, user):
        r = user.get(f"{BASE_URL}/api/reports/summary", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "preventive" in data
        for s in data.get("services", []):
            assert "cost" not in s
