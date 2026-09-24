"""SIMIN API tests: auth, RBAC, CRUD, dashboard, reports."""
import os
import uuid
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://maint-log-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "vivianmarshela27@gmail.com"
ADMIN_PASSWORD = "Admin#2026"
USER_EMAIL = "operator@simin.co.id"
USER_PASSWORD = "Operator#2026"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="module")
def admin_session():
    s, u = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert u["role"] == "admin"
    return s


@pytest.fixture(scope="module")
def user_session():
    s, u = _login(USER_EMAIL, USER_PASSWORD)
    assert u["role"] == "user"
    return s


# --------------------- Auth ---------------------
class TestAuth:
    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code in (401, 429)

    def test_me_admin(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_user(self, user_session):
        r = user_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "user"

    def test_refresh(self, admin_session):
        r = admin_session.post(f"{API}/auth/refresh")
        assert r.status_code == 200

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# --------------------- Dashboard cost gating ---------------------
class TestDashboard:
    def test_admin_sees_cost(self, admin_session):
        r = admin_session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total_cost" in data
        assert "monthly_cost" in data

    def test_user_no_cost(self, user_session):
        r = user_session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total_cost" not in data
        assert "monthly_cost" not in data


# --------------------- Spareparts strip price ---------------------
class TestSpareparts:
    def test_admin_sees_price(self, admin_session):
        r = admin_session.get(f"{API}/spareparts")
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert "price" in items[0]

    def test_user_no_price(self, user_session):
        r = user_session.get(f"{API}/spareparts")
        assert r.status_code == 200
        for i in r.json():
            assert "price" not in i


# --------------------- CRUD Machines & RBAC ---------------------
class TestMachineCRUD:
    def test_admin_crud_machine(self, admin_session):
        payload = {"code": f"TEST_{uuid.uuid4().hex[:6]}", "name": "TEST_Machine",
                   "type": "Test", "location": "Line X", "status": "operasional"}
        r = admin_session.post(f"{API}/machines", json=payload)
        assert r.status_code == 200, r.text
        mid = r.json()["id"]

        # GET verifies persistence
        r = admin_session.get(f"{API}/machines")
        assert any(m["id"] == mid for m in r.json())

        # PUT
        payload["name"] = "TEST_Machine_Upd"
        r = admin_session.put(f"{API}/machines/{mid}", json=payload)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Machine_Upd"

        # DELETE
        r = admin_session.delete(f"{API}/machines/{mid}")
        assert r.status_code == 200

    def test_user_cannot_create(self, user_session):
        r = user_session.post(f"{API}/machines", json={"code": "X", "name": "Y"})
        assert r.status_code == 403

    def test_user_cannot_delete(self, user_session, admin_session):
        # Create as admin
        r = admin_session.post(f"{API}/machines", json={"code": f"TEST_{uuid.uuid4().hex[:6]}", "name": "TEST_del"})
        mid = r.json()["id"]
        r = user_session.delete(f"{API}/machines/{mid}")
        assert r.status_code == 403
        # cleanup
        admin_session.delete(f"{API}/machines/{mid}")


# --------------------- CRUD Spareparts & stock reduction ---------------------
class TestSparepartAndService:
    def test_create_sparepart_and_service_reduces_stock(self, admin_session):
        # Create sparepart
        sp = {"code": f"TEST_{uuid.uuid4().hex[:6]}", "name": "TEST_SP", "stock": 10, "min_stock": 2, "price": 1000}
        r = admin_session.post(f"{API}/spareparts", json=sp)
        assert r.status_code == 200
        sp_id = r.json()["id"]

        # Create machine
        mr = admin_session.post(f"{API}/machines", json={"code": f"TEST_{uuid.uuid4().hex[:6]}", "name": "TEST_M"})
        mid = mr.json()["id"]

        # Create service using 3 units
        svc = {"machine_id": mid, "date": date.today().isoformat(), "service_type": "perbaikan",
               "used_parts": [{"sparepart_id": sp_id, "name": "TEST_SP", "qty": 3}], "cost": 5000}
        r = admin_session.post(f"{API}/services", json=svc)
        assert r.status_code == 200, r.text
        svc_id = r.json()["id"]

        # Verify stock reduced
        r = admin_session.get(f"{API}/spareparts")
        item = next(x for x in r.json() if x["id"] == sp_id)
        assert item["stock"] == 7

        # cleanup
        admin_session.delete(f"{API}/services/{svc_id}")
        admin_session.delete(f"{API}/spareparts/{sp_id}")
        admin_session.delete(f"{API}/machines/{mid}")


# --------------------- Schedules & Technicians RBAC ---------------------
class TestSchedulesTechs:
    def test_admin_create_technician_and_schedule(self, admin_session):
        r = admin_session.post(f"{API}/technicians", json={"name": "TEST_Tech", "specialty": "Test"})
        assert r.status_code == 200
        tid = r.json()["id"]

        # need a machine
        mr = admin_session.post(f"{API}/machines", json={"code": f"TEST_{uuid.uuid4().hex[:6]}", "name": "TEST_M"})
        mid = mr.json()["id"]

        sched = {"machine_id": mid, "maintenance_type": "TEST", "due_date": (date.today()+timedelta(days=3)).isoformat(),
                 "technician_id": tid}
        r = admin_session.post(f"{API}/schedules", json=sched)
        assert r.status_code == 200
        sid = r.json()["id"]

        # cleanup
        admin_session.delete(f"{API}/schedules/{sid}")
        admin_session.delete(f"{API}/technicians/{tid}")
        admin_session.delete(f"{API}/machines/{mid}")

    def test_user_cannot_create_tech(self, user_session):
        r = user_session.post(f"{API}/technicians", json={"name": "X"})
        assert r.status_code == 403

    def test_user_cannot_create_schedule(self, user_session):
        r = user_session.post(f"{API}/schedules", json={"machine_id": "x", "maintenance_type": "y", "due_date": "2026-01-01"})
        assert r.status_code == 403


# --------------------- User management (admin only) ---------------------
class TestUserManagement:
    def test_user_cannot_list_users(self, user_session):
        r = user_session.get(f"{API}/users")
        assert r.status_code == 403

    def test_admin_user_crud(self, admin_session):
        email = f"test_{uuid.uuid4().hex[:6]}@example.com"
        r = admin_session.post(f"{API}/users", json={"email": email, "password": "Testpass1!", "name": "TEST", "role": "user"})
        assert r.status_code == 200, r.text
        uid = r.json()["id"]

        # update role
        r = admin_session.put(f"{API}/users/{uid}", json={"role": "admin"})
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

        # delete
        r = admin_session.delete(f"{API}/users/{uid}")
        assert r.status_code == 200


# --------------------- Reports ---------------------
class TestReports:
    def test_admin_report_has_cost(self, admin_session):
        r = admin_session.get(f"{API}/reports/summary")
        assert r.status_code == 200
        data = r.json()
        if data["services"]:
            assert "cost" in data["services"][0]

    def test_user_report_no_cost(self, user_session):
        r = user_session.get(f"{API}/reports/summary")
        assert r.status_code == 200
        for s in r.json()["services"]:
            assert "cost" not in s
