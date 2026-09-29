"""Checksheet feature tests: templates CRUD RBAC + schedule checksheet save RBAC."""
import os
import uuid
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Admin#2026"
USER_USERNAME = "operator"
USER_PASSWORD = "Operator#2026"


def _login(username, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"username": username, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="module")
def admin_session():
    s, u = _login(ADMIN_USERNAME, ADMIN_PASSWORD)
    assert u["role"] == "admin"
    return s


@pytest.fixture(scope="module")
def user_session():
    s, u = _login(USER_USERNAME, USER_PASSWORD)
    assert u["role"] == "user"
    return s


class TestChecksheetTemplates:
    def test_seeded_templates_exist(self, admin_session):
        r = admin_session.get(f"{API}/checksheet-templates")
        assert r.status_code == 200
        names = [t["name"] for t in r.json()]
        assert "Checksheet Umum Mesin Produksi" in names
        assert "Checksheet Kompresor Udara" in names

    def test_user_can_list_templates(self, user_session):
        r = user_session.get(f"{API}/checksheet-templates")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_user_cannot_create_template(self, user_session):
        r = user_session.post(f"{API}/checksheet-templates",
                              json={"name": "TEST_x", "items": []})
        assert r.status_code == 403

    def test_user_cannot_update_template(self, user_session, admin_session):
        # ensure some template exists
        tid = admin_session.get(f"{API}/checksheet-templates").json()[0]["id"]
        r = user_session.put(f"{API}/checksheet-templates/{tid}",
                             json={"name": "TEST_hack", "items": []})
        assert r.status_code == 403

    def test_user_cannot_delete_template(self, user_session, admin_session):
        tid = admin_session.get(f"{API}/checksheet-templates").json()[0]["id"]
        r = user_session.delete(f"{API}/checksheet-templates/{tid}")
        assert r.status_code == 403

    def test_admin_template_crud(self, admin_session):
        payload = {"name": f"TEST_{uuid.uuid4().hex[:6]}", "machine_type": "Test",
                   "items": [
                       {"item": "Suhu", "is_sub": False, "unit": "C", "std_min": "10", "std_max": "50"},
                       {"item": "Bearing depan", "is_sub": True, "unit": "C", "std_min": "10", "std_max": "50"},
                   ]}
        r = admin_session.post(f"{API}/checksheet-templates", json=payload)
        assert r.status_code == 200
        created = r.json()
        assert created["name"] == payload["name"]
        assert len(created["items"]) == 2
        assert created["items"][0].get("is_sub") is False
        assert created["items"][1].get("is_sub") is True
        assert created["items"][1]["item"] == "Bearing depan"
        assert "id" in created
        tid = created["id"]

        # verify GET persistence
        listing = admin_session.get(f"{API}/checksheet-templates").json()
        got = next(t for t in listing if t["id"] == tid)
        assert got["items"][1].get("is_sub") is True
        assert got["items"][0].get("is_sub") is False

        # update - add a main item; ensure is_sub persists per item
        payload["name"] = payload["name"] + "_upd"
        payload["items"].append({"item": "Tekanan", "is_sub": False, "unit": "bar", "std_min": "1", "std_max": "3"})
        r = admin_session.put(f"{API}/checksheet-templates/{tid}", json=payload)
        assert r.status_code == 200
        assert r.json()["name"].endswith("_upd")
        assert len(r.json()["items"]) == 3
        assert r.json()["items"][2].get("is_sub") is False
        assert r.json()["items"][1].get("is_sub") is True

        # delete
        r = admin_session.delete(f"{API}/checksheet-templates/{tid}")
        assert r.status_code == 200
        # verify removal
        listing = admin_session.get(f"{API}/checksheet-templates").json()
        assert not any(t["id"] == tid for t in listing)


class TestScheduleChecksheet:
    @pytest.fixture(scope="class")
    def schedule_id(self, admin_session):
        # create dedicated schedule for checksheet tests
        mr = admin_session.post(f"{API}/machines",
                                json={"code": f"TEST_{uuid.uuid4().hex[:6]}", "name": "TEST_M_CS"})
        mid = mr.json()["id"]
        sr = admin_session.post(f"{API}/schedules", json={
            "machine_id": mid, "machine_name": "TEST_M_CS",
            "maintenance_type": "TEST_CS", "due_date": (date.today() + timedelta(days=1)).isoformat(),
        })
        sid = sr.json()["id"]
        yield sid
        # cleanup
        admin_session.delete(f"{API}/schedules/{sid}")
        admin_session.delete(f"{API}/machines/{mid}")

    def test_admin_save_checksheet_and_persist(self, admin_session, schedule_id):
        payload = {
            "items": [
                {"item": "Tekanan", "is_sub": False, "value": "3", "unit": "bar", "std_min": "2", "std_max": "5",
                 "result": "ok", "note": ""},
                {"item": "Line utama", "is_sub": True, "value": "3", "unit": "bar", "std_min": "", "std_max": "",
                 "result": "ok", "note": ""},
                {"item": "Suhu", "is_sub": False, "value": "90", "unit": "C", "std_min": "40", "std_max": "80",
                 "result": "not_ok", "note": "over"},
                {"item": "Bearing belakang", "is_sub": True, "value": "90", "unit": "C", "std_min": "", "std_max": "",
                 "result": "not_ok", "note": "over"},
            ],
            "operator_name": "TEST_Op",
            "technician_name": "TEST_Tek",
            "operator_signature": "data:image/png;base64,AAAA",
            "technician_signature": "data:image/png;base64,BBBB",
        }
        r = admin_session.put(f"{API}/schedules/{schedule_id}/checksheet", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "checksheet" in data
        cs = data["checksheet"]
        assert cs["operator_name"] == "TEST_Op"
        assert cs["technician_name"] == "TEST_Tek"
        assert len(cs["items"]) == 4
        assert cs["items"][0]["result"] == "ok"
        assert cs["items"][2]["result"] == "not_ok"
        assert cs["items"][0]["is_sub"] is False
        assert cs["items"][1]["is_sub"] is True
        assert cs["items"][1]["item"] == "Line utama"
        assert cs["items"][3]["is_sub"] is True

        # verify via GET /schedules
        listing = admin_session.get(f"{API}/schedules").json()
        s = next(x for x in listing if x["id"] == schedule_id)
        assert s["checksheet"]["operator_name"] == "TEST_Op"
        assert len(s["checksheet"]["items"]) == 4
        assert s["checksheet"]["items"][1]["is_sub"] is True
        assert s["checksheet"]["items"][0]["is_sub"] is False

    def test_user_cannot_save_checksheet(self, user_session, schedule_id):
        r = user_session.put(f"{API}/schedules/{schedule_id}/checksheet",
                             json={"items": [], "operator_name": "x", "technician_name": "y"})
        assert r.status_code == 403

    def test_user_can_read_schedule_with_checksheet(self, user_session, schedule_id):
        # user reads schedules and sees the checksheet saved above
        listing = user_session.get(f"{API}/schedules").json()
        s = next((x for x in listing if x["id"] == schedule_id), None)
        assert s is not None
        assert "checksheet" in s

    def test_save_checksheet_on_missing_schedule_404(self, admin_session):
        r = admin_session.put(f"{API}/schedules/nonexistent-id/checksheet",
                              json={"items": [], "operator_name": "", "technician_name": ""})
        assert r.status_code == 404
