"""Tests for the 3 checksheet enhancements: note persistence, delete-only-checksheet, RBAC."""
import os
import uuid
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin", "Admin#2026")
USER = ("operator", "Operator#2026")


def _login(u, p):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"username": u, "password": p}, timeout=15)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def admin_session():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def user_session():
    return _login(*USER)


@pytest.fixture
def fresh_schedule(admin_session):
    mr = admin_session.post(f"{API}/machines",
                            json={"code": f"TEST_{uuid.uuid4().hex[:6]}", "name": "TEST_M_ENH"})
    mid = mr.json()["id"]
    sr = admin_session.post(f"{API}/schedules", json={
        "machine_id": mid, "machine_name": "TEST_M_ENH",
        "maintenance_type": "TEST_ENH", "due_date": (date.today() + timedelta(days=1)).isoformat(),
    })
    sid = sr.json()["id"]
    yield sid
    admin_session.delete(f"{API}/schedules/{sid}")
    admin_session.delete(f"{API}/machines/{mid}")


class TestChecksheetNote:
    def test_save_and_persist_note(self, admin_session, fresh_schedule):
        note = "General note - kondisi umum baik, perlu monitoring vibrasi."
        payload = {
            "items": [{"item": "Suhu", "value": "50", "unit": "C", "result": "ok"}],
            "operator_name": "Op", "technician_name": "Tek",
            "operator_signature": "", "technician_signature": "",
            "note": note,
        }
        r = admin_session.put(f"{API}/schedules/{fresh_schedule}/checksheet", json=payload)
        assert r.status_code == 200
        assert r.json()["checksheet"]["note"] == note
        # verify via list
        listing = admin_session.get(f"{API}/schedules").json()
        s = next(x for x in listing if x["id"] == fresh_schedule)
        assert s["checksheet"]["note"] == note

    def test_empty_note_defaults(self, admin_session, fresh_schedule):
        payload = {
            "items": [{"item": "X", "value": "1", "result": "ok"}],
            "operator_name": "", "technician_name": "",
            "operator_signature": "", "technician_signature": "",
        }
        r = admin_session.put(f"{API}/schedules/{fresh_schedule}/checksheet", json=payload)
        assert r.status_code == 200
        assert r.json()["checksheet"].get("note", "") == ""


class TestDeleteChecksheet:
    def test_admin_delete_only_checksheet_schedule_remains(self, admin_session, fresh_schedule):
        # fill checksheet
        admin_session.put(f"{API}/schedules/{fresh_schedule}/checksheet", json={
            "items": [{"item": "A", "value": "1", "result": "ok"}],
            "operator_name": "", "technician_name": "",
            "operator_signature": "", "technician_signature": "", "note": "n",
        })
        # delete
        r = admin_session.delete(f"{API}/schedules/{fresh_schedule}/checksheet")
        assert r.status_code == 200
        # schedule still exists, machine_name intact, no checksheet key
        listing = admin_session.get(f"{API}/schedules").json()
        s = next(x for x in listing if x["id"] == fresh_schedule)
        assert s is not None
        assert s["machine_name"] == "TEST_M_ENH"
        assert "checksheet" not in s

    def test_user_forbidden_delete(self, user_session, admin_session, fresh_schedule):
        admin_session.put(f"{API}/schedules/{fresh_schedule}/checksheet", json={
            "items": [{"item": "A", "value": "1", "result": "ok"}],
            "operator_name": "", "technician_name": "",
            "operator_signature": "", "technician_signature": "", "note": "",
        })
        r = user_session.delete(f"{API}/schedules/{fresh_schedule}/checksheet")
        assert r.status_code == 403

    def test_user_forbidden_save(self, user_session, fresh_schedule):
        r = user_session.put(f"{API}/schedules/{fresh_schedule}/checksheet", json={
            "items": [], "operator_name": "", "technician_name": "",
            "operator_signature": "", "technician_signature": "", "note": "",
        })
        assert r.status_code == 403

    def test_delete_missing_schedule_404(self, admin_session):
        r = admin_session.delete(f"{API}/schedules/nonexistent-id-xyz/checksheet")
        assert r.status_code == 404
