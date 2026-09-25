"""Regression tests after CORS/env/list_users projection changes for deployment readiness."""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin", "Admin#2026")
USER = ("operator", "Operator#2026")


def _login(username, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"username": username, "password": password}, timeout=15)
    return s, r


@pytest.fixture(scope="module")
def admin_session():
    s, r = _login(*ADMIN)
    assert r.status_code == 200, r.text
    # httpOnly cookie set
    assert any(c for c in s.cookies), "no cookies set on admin login"
    return s


@pytest.fixture(scope="module")
def user_session():
    s, r = _login(*USER)
    assert r.status_code == 200, r.text
    assert any(c for c in s.cookies), "no cookies set on user login"
    return s


# --- Auth / cookie session ---
class TestAuth:
    def test_admin_login_and_me(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == "admin"
        assert data["role"] == "admin"
        assert "password_hash" not in data
        assert "password" not in data

    def test_user_login_and_me(self, user_session):
        r = user_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == "operator"
        assert data["role"] == "user"

    def test_login_response_has_no_password(self):
        _, r = _login(*ADMIN)
        body = r.json()
        assert "password_hash" not in body
        assert "password" not in body


# --- list_users projection ---
class TestListUsers:
    def test_admin_list_users_hides_password_hash(self, admin_session):
        r = admin_session.get(f"{API}/users")
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list) and len(users) >= 1
        for u in users:
            assert "password_hash" not in u, f"password_hash leaked: {u}"
            assert "password" not in u, f"password leaked: {u}"
            # projection should still include the expected safe fields
            assert "username" in u
            assert "role" in u

    def test_user_cannot_list_users(self, user_session):
        r = user_session.get(f"{API}/users")
        assert r.status_code == 403


# --- Field stripping for users ---
class TestFieldStripping:
    def test_user_spareparts_hides_price(self, user_session):
        r = user_session.get(f"{API}/spareparts")
        assert r.status_code == 200
        for item in r.json():
            assert "price" not in item, f"price leaked to user: {item}"

    def test_admin_spareparts_shows_price(self, admin_session):
        r = admin_session.get(f"{API}/spareparts")
        assert r.status_code == 200
        items = r.json()
        if items:
            # at least one item should expose price field for admin
            assert any("price" in i for i in items), "admin should see price on spareparts"

    def test_user_services_hides_cost(self, user_session):
        r = user_session.get(f"{API}/services")
        assert r.status_code == 200
        for item in r.json():
            assert "cost" not in item, f"cost leaked to user: {item}"

    def test_admin_services_shows_cost(self, admin_session):
        r = admin_session.get(f"{API}/services")
        assert r.status_code == 200
        items = r.json()
        if items:
            assert any("cost" in i for i in items), "admin should see cost on services"


# --- Role gating ---
class TestRoleGating:
    def test_user_cannot_create_machine(self, user_session):
        r = user_session.post(f"{API}/machines", json={"code": "TEST_x", "name": "TEST_y"})
        assert r.status_code == 403

    def test_user_cannot_create_checksheet_template(self, user_session):
        r = user_session.post(f"{API}/checksheet-templates",
                              json={"name": "TEST_x", "items": []})
        assert r.status_code == 403

    def test_user_cannot_put_schedule_checksheet(self, user_session):
        # use any schedule id - 403 should happen before 404 for RBAC
        r = user_session.put(f"{API}/schedules/nonexistent-id/checksheet",
                             json={"items": [], "operator_name": "", "technician_name": ""})
        assert r.status_code == 403


# --- Dashboard stats ---
class TestDashboardStats:
    def test_admin_stats_has_cost_fields(self, admin_session):
        r = admin_session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total_cost" in data, f"admin stats missing total_cost: {data}"
        assert "monthly_cost" in data, f"admin stats missing monthly_cost: {data}"

    def test_user_stats_excludes_cost_fields(self, user_session):
        r = user_session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total_cost" not in data, f"user stats leaked total_cost: {data}"
        assert "monthly_cost" not in data, f"user stats leaked monthly_cost: {data}"


# --- Checksheet templates seeded ---
class TestChecksheetTemplatesSeed:
    def test_seeded_templates_present(self, admin_session):
        r = admin_session.get(f"{API}/checksheet-templates")
        assert r.status_code == 200
        names = [t["name"] for t in r.json()]
        assert "Checksheet Umum Mesin Produksi" in names
        assert "Checksheet Kompresor Udara" in names


# --- CORS ---
class TestCORS:
    def test_cors_preflight_headers(self):
        origin = BASE_URL
        r = requests.options(
            f"{API}/auth/login",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
            timeout=15,
        )
        # Cloudflare edge may 400 on the preflight body but CORS headers still flow through
        assert r.headers.get("access-control-allow-credentials", "").lower() == "true"
        allow_methods = r.headers.get("access-control-allow-methods", "")
        assert "POST" in allow_methods

    def test_cors_simple_request_with_origin(self):
        origin = BASE_URL
        r = requests.get(f"{API}/", headers={"Origin": origin}, timeout=15)
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-credentials", "").lower() == "true"
