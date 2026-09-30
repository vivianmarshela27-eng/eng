"""Backend tests for Perpustakaan Dokumen (Document Library) - object storage."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://maint-log-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"username": "admin", "password": "Admin#2026"}
USER = {"username": "operator", "password": "Operator#2026"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed for {creds['username']}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin_session():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def user_session():
    return _login(USER)


@pytest.fixture(scope="module")
def cleanup_ids():
    ids = []
    yield ids
    # best-effort cleanup
    try:
        s = _login(ADMIN)
        for fid in ids:
            s.delete(f"{API}/files/{fid}", timeout=30)
    except Exception:
        pass


def test_list_files_admin(admin_session):
    r = admin_session.get(f"{API}/files", timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_files_user(user_session):
    r = user_session.get(f"{API}/files", timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_upload_as_admin(admin_session, cleanup_ids):
    content = b"Hello Satria Engineering - test file content."
    files = {"file": ("TEST_hello.txt", io.BytesIO(content), "text/plain")}
    data = {"title": "TEST_hello_title"}
    r = admin_session.post(f"{API}/files", files=files, data=data, timeout=60)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["original_filename"] == "TEST_hello.txt"
    assert body["title"] == "TEST_hello_title"
    assert body["size"] == len(content)
    assert body["content_type"].startswith("text/plain")
    assert "id" in body and body["id"]
    assert body.get("uploaded_by")
    assert body.get("created_at")
    cleanup_ids.append(body["id"])

    # GET verify persisted
    lst = admin_session.get(f"{API}/files", timeout=30).json()
    assert any(f["id"] == body["id"] for f in lst)


def test_upload_forbidden_for_user(user_session):
    files = {"file": ("TEST_forbidden.txt", io.BytesIO(b"nope"), "text/plain")}
    r = user_session.post(f"{API}/files", files=files, data={"title": ""}, timeout=30)
    assert r.status_code == 403


def test_upload_oversize_returns_400(admin_session):
    big = b"x" * (2 * 1024 * 1024 + 100)
    files = {"file": ("TEST_big.bin", io.BytesIO(big), "application/octet-stream")}
    r = admin_session.post(f"{API}/files", files=files, data={"title": ""}, timeout=60)
    assert r.status_code == 400
    assert "melebihi 2 MB" in r.json().get("detail", "")


def test_download_as_user(admin_session, user_session, cleanup_ids):
    # create via admin
    content = b"Download-me-content-1234567890"
    files = {"file": ("TEST_dl.txt", io.BytesIO(content), "text/plain")}
    r = admin_session.post(f"{API}/files", files=files, data={"title": "TEST_dl"}, timeout=60)
    assert r.status_code == 200
    fid = r.json()["id"]
    cleanup_ids.append(fid)

    # user downloads
    d = user_session.get(f"{API}/files/{fid}/download", timeout=60)
    assert d.status_code == 200
    assert d.content == content
    cd = d.headers.get("Content-Disposition", "")
    assert "attachment" in cd.lower()
    assert "TEST_dl.txt" in cd or "TEST_dl" in cd


def test_delete_forbidden_for_user(admin_session, user_session, cleanup_ids):
    content = b"protected"
    files = {"file": ("TEST_prot.txt", io.BytesIO(content), "text/plain")}
    r = admin_session.post(f"{API}/files", files=files, data={"title": ""}, timeout=60)
    fid = r.json()["id"]
    cleanup_ids.append(fid)

    d = user_session.delete(f"{API}/files/{fid}", timeout=30)
    assert d.status_code == 403


def test_delete_as_admin_soft_deletes(admin_session):
    content = b"to-be-deleted"
    files = {"file": ("TEST_del.txt", io.BytesIO(content), "text/plain")}
    r = admin_session.post(f"{API}/files", files=files, data={"title": ""}, timeout=60)
    fid = r.json()["id"]

    d = admin_session.delete(f"{API}/files/{fid}", timeout=30)
    assert d.status_code == 200

    lst = admin_session.get(f"{API}/files", timeout=30).json()
    assert not any(f["id"] == fid for f in lst)

    # download after delete: 404
    dl = admin_session.get(f"{API}/files/{fid}/download", timeout=30)
    assert dl.status_code == 404


def test_unauth_list_401(admin_session):
    r = requests.get(f"{API}/files", timeout=30)
    assert r.status_code in (401, 403)
