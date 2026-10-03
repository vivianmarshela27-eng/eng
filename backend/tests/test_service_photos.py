"""Backend tests for service photos feature (POST/PUT /api/services photos array, role gating, file download)."""
import io
import os
import struct
import zlib
import pytest
import requests

def _load_frontend_env():
    try:
        with open('/app/frontend/.env') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception:
        pass
    return ''

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or _load_frontend_env()).rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL not set"

ADMIN = {"username": "admin", "password": "Admin#2026"}
USER = {"username": "operator", "password": "Operator#2026"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    return s


def _make_png(size=10):
    # Build a minimal valid PNG
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    raw = b""
    for _ in range(size):
        raw += b"\x00" + b"\xff\x00\x00" * size
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture(scope="module")
def admin_session():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def user_session():
    return _login(USER)


@pytest.fixture(scope="module")
def machine_id(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/machines", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0, "seed machines missing"
    return data[0]["id"]


# -------- file upload (admin) --------
def test_admin_upload_image(admin_session):
    png = _make_png()
    files = {"file": ("TEST_photo.png", png, "image/png")}
    r = admin_session.post(f"{BASE_URL}/api/files", files=files, data={"title": "TEST_photo"}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "id" in data and data["content_type"] == "image/png"
    pytest.file_id = data["id"]
    pytest.filename = data["original_filename"]


def test_user_cannot_upload(user_session):
    png = _make_png()
    files = {"file": ("TEST_user.png", png, "image/png")}
    r = user_session.post(f"{BASE_URL}/api/files", files=files, timeout=30)
    assert r.status_code == 403


def test_download_file_as_user(user_session):
    # user can GET /api/files/<id>/download
    r = user_session.get(f"{BASE_URL}/api/files/{pytest.file_id}/download", timeout=30)
    assert r.status_code == 200
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n"


# -------- services with photos --------
def test_create_service_with_photos(admin_session, machine_id):
    payload = {
        "machine_id": machine_id, "date": "2026-01-15", "service_type": "perbaikan",
        "problem": "TEST_photo_problem", "action": "TEST_photo_action",
        "cost": 100, "status": "selesai",
        "photos": [{"file_id": pytest.file_id, "filename": pytest.filename, "content_type": "image/png"}],
    }
    r = admin_session.post(f"{BASE_URL}/api/services", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "id" in data
    assert isinstance(data["photos"], list) and len(data["photos"]) == 1
    assert data["photos"][0]["file_id"] == pytest.file_id
    assert data["photos"][0]["filename"] == pytest.filename
    assert data["photos"][0]["content_type"] == "image/png"
    pytest.service_id = data["id"]

    # GET verify persistence
    r2 = admin_session.get(f"{BASE_URL}/api/services", timeout=15)
    assert r2.status_code == 200
    svc = next(s for s in r2.json() if s["id"] == pytest.service_id)
    assert len(svc["photos"]) == 1
    assert svc["photos"][0]["file_id"] == pytest.file_id


def test_update_service_remove_photos(admin_session, machine_id):
    payload = {
        "machine_id": machine_id, "date": "2026-01-15", "service_type": "perbaikan",
        "problem": "TEST_photo_problem", "action": "TEST_photo_action",
        "cost": 100, "status": "selesai", "photos": [],
    }
    r = admin_session.put(f"{BASE_URL}/api/services/{pytest.service_id}", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["photos"] == []

    # verify
    r2 = admin_session.get(f"{BASE_URL}/api/services", timeout=15)
    svc = next(s for s in r2.json() if s["id"] == pytest.service_id)
    assert svc["photos"] == []


def test_service_without_photos_still_works(admin_session, machine_id):
    payload = {
        "machine_id": machine_id, "date": "2026-01-16", "service_type": "preventif",
        "problem": "TEST_nophoto", "action": "x", "cost": 50, "status": "selesai",
    }
    r = admin_session.post(f"{BASE_URL}/api/services", json=payload, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["photos"] == []
    # cleanup
    admin_session.delete(f"{BASE_URL}/api/services/{data['id']}", timeout=15)


# -------- role gating --------
def test_user_can_get_services(user_session):
    r = user_session.get(f"{BASE_URL}/api/services", timeout=15)
    assert r.status_code == 200
    # cost should be stripped
    for s in r.json():
        assert "cost" not in s


def test_user_cannot_post_service(user_session, machine_id):
    r = user_session.post(f"{BASE_URL}/api/services", json={
        "machine_id": machine_id, "date": "2026-01-01", "service_type": "preventif",
    }, timeout=15)
    assert r.status_code == 403


def test_user_cannot_put_service(user_session, machine_id):
    r = user_session.put(f"{BASE_URL}/api/services/{pytest.service_id}", json={
        "machine_id": machine_id, "date": "2026-01-01", "service_type": "preventif",
    }, timeout=15)
    assert r.status_code == 403


def test_user_cannot_delete_service(user_session):
    r = user_session.delete(f"{BASE_URL}/api/services/{pytest.service_id}", timeout=15)
    assert r.status_code == 403


# -------- cleanup --------
def test_zzz_cleanup(admin_session):
    admin_session.delete(f"{BASE_URL}/api/services/{pytest.service_id}", timeout=15)
    admin_session.delete(f"{BASE_URL}/api/files/{pytest.file_id}", timeout=15)
