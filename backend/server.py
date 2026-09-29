from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

import os
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr

# ------------------------------------------------------------------ setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="SIMIN - Sistem Informasi Pemeliharaan Mesin")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("simin")

JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ------------------------------------------------------------------ auth utils
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, username: str, token_version: int = 0) -> str:
    payload = {"sub": user_id, "username": username, "ver": token_version,
               "exp": datetime.now(timezone.utc) + timedelta(hours=8), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, token_version: int = 0) -> str:
    payload = {"sub": user_id, "ver": token_version,
               "exp": datetime.now(timezone.utc) + timedelta(days=1), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    # Session cookies (no max_age) -> expire when the browser is closed.
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", path="/")


def public_user(u: dict) -> dict:
    return {"id": str(u["_id"]), "username": u["username"], "name": u.get("name", ""),
            "role": u.get("role", "user")}


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Belum terautentikasi")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Tipe token tidak valid")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
        if payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(status_code=401, detail="Sesi berakhir")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat melakukan aksi ini")
    return user


def is_admin(user: dict) -> bool:
    return user.get("role") == "admin"


# ------------------------------------------------------------------ auth models
class LoginInput(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str = "user"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


# ------------------------------------------------------------------ auth endpoints
MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


@api.post("/auth/login")
async def login(payload: LoginInput, request: Request, response: Response):
    username = payload.username.strip().lower()
    ip = request.client.host if request.client else "?"
    identifier = f"{ip}:{username}"

    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= MAX_ATTEMPTS:
        locked_until = rec.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Terlalu banyak percobaan. Coba lagi dalam 15 menit.")

    user = await db.users.find_one({"username": username})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"username": username,
             "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=LOCK_MINUTES)).isoformat()}},
            upsert=True)
        raise HTTPException(status_code=401, detail="Nama pengguna atau kata sandi salah")

    await db.login_attempts.delete_many({"identifier": identifier})
    ver = user.get("token_version", 0)
    access = create_access_token(str(user["_id"]), username, ver)
    refresh = create_refresh_token(str(user["_id"]), ver)
    set_auth_cookies(response, access, refresh)
    return public_user(user)


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Berhasil keluar"}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Tidak ada token refresh")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Tipe token tidak valid")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(status_code=401, detail="Sesi berakhir")
        ver = user.get("token_version", 0)
        access = create_access_token(str(user["_id"]), user["username"], ver)
        new_refresh = create_refresh_token(str(user["_id"]), ver)
        set_auth_cookies(response, access, new_refresh)
        return public_user(user)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")


# ------------------------------------------------------------------ user management (admin)
@api.get("/users")
async def list_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"username": 1, "name": 1, "role": 1, "created_at": 1}).sort("created_at", 1).to_list(500)
    return [public_user(u) for u in users]


@api.post("/users")
async def create_user(payload: UserCreate, user: dict = Depends(require_admin)):
    username = payload.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Nama pengguna sudah terdaftar")
    if payload.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Peran tidak valid")
    doc = {"username": username, "password_hash": hash_password(payload.password),
           "name": payload.name, "role": payload.role, "token_version": 0,
           "created_at": now_iso()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return public_user(doc)


@api.put("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, user: dict = Depends(require_admin)):
    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.role is not None:
        if payload.role not in ("admin", "user"):
            raise HTTPException(status_code=400, detail="Peran tidak valid")
        updates["role"] = payload.role
    if payload.password:
        updates["password_hash"] = hash_password(payload.password)
        updates["token_version"] = (await db.users.find_one({"_id": ObjectId(user_id)})).get("token_version", 0) + 1
    if not updates:
        raise HTTPException(status_code=400, detail="Tidak ada data untuk diperbarui")
    res = await db.users.find_one_and_update({"_id": ObjectId(user_id)}, {"$set": updates},
                                             return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    return public_user(res)


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_admin)):
    if str(user["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus akun sendiri")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"message": "Pengguna dihapus"}


# ------------------------------------------------------------------ generic CRUD helpers
def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ------------------------------------------------------------------ Machines
class MachineIn(BaseModel):
    code: str
    name: str
    type: Optional[str] = ""
    location: Optional[str] = ""
    purchase_date: Optional[str] = ""
    status: str = "operasional"  # operasional | perawatan | rusak | nonaktif
    notes: Optional[str] = ""


@api.get("/machines")
async def list_machines(user: dict = Depends(get_current_user)):
    items = await db.machines.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.post("/machines")
async def create_machine(payload: MachineIn, user: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.machines.insert_one(doc)
    return clean(doc)


@api.put("/machines/{item_id}")
async def update_machine(item_id: str, payload: MachineIn, user: dict = Depends(require_admin)):
    res = await db.machines.find_one_and_update({"id": item_id}, {"$set": payload.model_dump()},
                                                projection={"_id": 0}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Mesin tidak ditemukan")
    return res


@api.delete("/machines/{item_id}")
async def delete_machine(item_id: str, user: dict = Depends(require_admin)):
    await db.machines.delete_one({"id": item_id})
    return {"message": "Mesin dihapus"}


# ------------------------------------------------------------------ Technicians
class TechnicianIn(BaseModel):
    name: str
    specialty: Optional[str] = ""
    phone: Optional[str] = ""
    status: str = "tersedia"  # tersedia | bertugas | cuti


@api.get("/technicians")
async def list_technicians(user: dict = Depends(get_current_user)):
    items = await db.technicians.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.post("/technicians")
async def create_technician(payload: TechnicianIn, user: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.technicians.insert_one(doc)
    return clean(doc)


@api.put("/technicians/{item_id}")
async def update_technician(item_id: str, payload: TechnicianIn, user: dict = Depends(require_admin)):
    res = await db.technicians.find_one_and_update({"id": item_id}, {"$set": payload.model_dump()},
                                                   projection={"_id": 0}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Teknisi tidak ditemukan")
    return res


@api.delete("/technicians/{item_id}")
async def delete_technician(item_id: str, user: dict = Depends(require_admin)):
    await db.technicians.delete_one({"id": item_id})
    return {"message": "Teknisi dihapus"}


# ------------------------------------------------------------------ Spareparts
class SparepartIn(BaseModel):
    code: str
    name: str
    category: Optional[str] = ""
    stock: int = 0
    min_stock: int = 0
    unit: Optional[str] = "pcs"
    location: Optional[str] = ""
    price: float = 0


def strip_price(item: dict, user: dict) -> dict:
    if not is_admin(user):
        item = dict(item)
        item.pop("price", None)
    return item


@api.get("/spareparts")
async def list_spareparts(user: dict = Depends(get_current_user)):
    items = await db.spareparts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [strip_price(i, user) for i in items]


@api.post("/spareparts")
async def create_sparepart(payload: SparepartIn, user: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.spareparts.insert_one(doc)
    return clean(doc)


@api.put("/spareparts/{item_id}")
async def update_sparepart(item_id: str, payload: SparepartIn, user: dict = Depends(require_admin)):
    res = await db.spareparts.find_one_and_update({"id": item_id}, {"$set": payload.model_dump()},
                                                  projection={"_id": 0}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Sparepart tidak ditemukan")
    return res


@api.delete("/spareparts/{item_id}")
async def delete_sparepart(item_id: str, user: dict = Depends(require_admin)):
    await db.spareparts.delete_one({"id": item_id})
    return {"message": "Sparepart dihapus"}


# ------------------------------------------------------------------ Schedules
class ScheduleIn(BaseModel):
    machine_id: str
    machine_name: Optional[str] = ""
    maintenance_type: str
    due_date: str
    frequency: str = "bulanan"  # harian | mingguan | bulanan
    technician_id: Optional[str] = ""
    technician_name: Optional[str] = ""
    status: str = "terjadwal"  # terjadwal | jatuh_tempo | selesai
    notes: Optional[str] = ""


@api.get("/schedules")
async def list_schedules(user: dict = Depends(get_current_user)):
    items = await db.schedules.find({}, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return items


@api.post("/schedules")
async def create_schedule(payload: ScheduleIn, user: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.schedules.insert_one(doc)
    return clean(doc)


@api.put("/schedules/{item_id}")
async def update_schedule(item_id: str, payload: ScheduleIn, user: dict = Depends(require_admin)):
    res = await db.schedules.find_one_and_update({"id": item_id}, {"$set": payload.model_dump()},
                                                 projection={"_id": 0}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    return res


@api.delete("/schedules/{item_id}")
async def delete_schedule(item_id: str, user: dict = Depends(require_admin)):
    await db.schedules.delete_one({"id": item_id})
    return {"message": "Jadwal dihapus"}


# ------------------------------------------------------------------ Checksheet Templates
class TemplateItem(BaseModel):
    item: str = ""
    sub_item: Optional[str] = ""
    unit: Optional[str] = ""
    std_min: Optional[str] = ""
    std_max: Optional[str] = ""


class ChecksheetTemplateIn(BaseModel):
    name: str
    machine_type: Optional[str] = ""
    items: List[TemplateItem] = []


@api.get("/checksheet-templates")
async def list_templates(user: dict = Depends(get_current_user)):
    items = await db.checksheet_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/checksheet-templates")
async def create_template(payload: ChecksheetTemplateIn, user: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.checksheet_templates.insert_one(doc)
    return clean(doc)


@api.put("/checksheet-templates/{item_id}")
async def update_template(item_id: str, payload: ChecksheetTemplateIn, user: dict = Depends(require_admin)):
    res = await db.checksheet_templates.find_one_and_update({"id": item_id}, {"$set": payload.model_dump()},
                                                            projection={"_id": 0}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")
    return res


@api.delete("/checksheet-templates/{item_id}")
async def delete_template(item_id: str, user: dict = Depends(require_admin)):
    await db.checksheet_templates.delete_one({"id": item_id})
    return {"message": "Template dihapus"}


# ------------------------------------------------------------------ Schedule Checksheet
class ChecksheetItem(BaseModel):
    item: str = ""
    sub_item: Optional[str] = ""
    value: Optional[str] = ""
    unit: Optional[str] = ""
    std_min: Optional[str] = ""
    std_max: Optional[str] = ""
    result: Optional[str] = ""  # ok | not_ok | ""
    note: Optional[str] = ""


class ChecksheetData(BaseModel):
    items: List[ChecksheetItem] = []
    operator_name: Optional[str] = ""
    technician_name: Optional[str] = ""
    operator_signature: Optional[str] = ""
    technician_signature: Optional[str] = ""


@api.put("/schedules/{item_id}/checksheet")
async def save_checksheet(item_id: str, payload: ChecksheetData, user: dict = Depends(require_admin)):
    data = payload.model_dump()
    data["updated_at"] = now_iso()
    res = await db.schedules.find_one_and_update({"id": item_id}, {"$set": {"checksheet": data}},
                                                 projection={"_id": 0}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    return res


# ------------------------------------------------------------------ Services / Repairs
class UsedPart(BaseModel):
    sparepart_id: str
    name: str
    qty: int


class ServiceIn(BaseModel):
    machine_id: str
    machine_name: Optional[str] = ""
    date: str
    service_type: str = "preventif"  # preventif | perbaikan
    problem: Optional[str] = ""
    action: Optional[str] = ""
    technician_id: Optional[str] = ""
    technician_name: Optional[str] = ""
    operator_name: Optional[str] = ""
    used_parts: List[UsedPart] = []
    cost: float = 0
    status: str = "selesai"  # dalam_proses | selesai
    operator_signature: Optional[str] = ""
    technician_signature: Optional[str] = ""


def strip_cost(item: dict, user: dict) -> dict:
    if not is_admin(user):
        item = dict(item)
        item.pop("cost", None)
    return item


async def apply_stock_reduction(used_parts: list):
    for p in used_parts:
        if p.get("sparepart_id") and p.get("qty"):
            await db.spareparts.update_one({"id": p["sparepart_id"]},
                                           {"$inc": {"stock": -abs(int(p["qty"]))}})


@api.get("/services")
async def list_services(machine_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"machine_id": machine_id} if machine_id else {}
    items = await db.services.find(q, {"_id": 0}).sort("date", -1).to_list(1000)
    return [strip_cost(i, user) for i in items]


@api.post("/services")
async def create_service(payload: ServiceIn, user: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.services.insert_one(doc)
    await apply_stock_reduction(doc.get("used_parts", []))
    return clean(doc)


@api.put("/services/{item_id}")
async def update_service(item_id: str, payload: ServiceIn, user: dict = Depends(require_admin)):
    res = await db.services.find_one_and_update({"id": item_id}, {"$set": payload.model_dump()},
                                                projection={"_id": 0}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Catatan servis tidak ditemukan")
    return res


@api.delete("/services/{item_id}")
async def delete_service(item_id: str, user: dict = Depends(require_admin)):
    await db.services.delete_one({"id": item_id})
    return {"message": "Catatan servis dihapus"}


# ------------------------------------------------------------------ Dashboard & Reports
def parse_date(s: str):
    try:
        return datetime.fromisoformat(s[:10]).date()
    except Exception:
        return None


@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    machines = await db.machines.find({}, {"_id": 0}).to_list(1000)
    spareparts = await db.spareparts.find({}, {"_id": 0}).to_list(1000)
    schedules = await db.schedules.find({}, {"_id": 0}).to_list(1000)
    services = await db.services.find({}, {"_id": 0}).to_list(1000)

    status_counts = {"operasional": 0, "perawatan": 0, "rusak": 0, "nonaktif": 0}
    for m in machines:
        status_counts[m.get("status", "operasional")] = status_counts.get(m.get("status", "operasional"), 0) + 1

    today = date.today()
    due_soon = []
    for s in schedules:
        if s.get("status") == "selesai":
            continue
        d = parse_date(s.get("due_date", ""))
        if d and d <= today + timedelta(days=7):
            due_soon.append(s)

    low_stock = [sp for sp in spareparts if sp.get("stock", 0) <= sp.get("min_stock", 0)]

    result = {
        "total_machines": len(machines),
        "status_counts": status_counts,
        "due_schedules_count": len(due_soon),
        "due_schedules": sorted(due_soon, key=lambda x: x.get("due_date", ""))[:8],
        "low_stock_count": len(low_stock),
        "low_stock_items": [{"name": i["name"], "code": i.get("code"), "stock": i.get("stock"),
                             "min_stock": i.get("min_stock")} for i in low_stock][:8],
        "total_services": len(services),
    }

    if is_admin(user):
        monthly = {}
        for sv in services:
            d = parse_date(sv.get("date", ""))
            if d:
                key = d.strftime("%Y-%m")
                monthly[key] = monthly.get(key, 0) + (sv.get("cost", 0) or 0)
        months = sorted(monthly.keys())[-6:]
        result["monthly_cost"] = [{"month": m, "cost": monthly[m]} for m in months]
        result["total_cost"] = sum(sv.get("cost", 0) or 0 for sv in services)
    return result


@api.get("/reports/summary")
async def reports_summary(user: dict = Depends(get_current_user)):
    services = await db.services.find({}, {"_id": 0}).sort("date", -1).to_list(2000)
    by_type = {"preventif": 0, "perbaikan": 0}
    for sv in services:
        by_type[sv.get("service_type", "preventif")] = by_type.get(sv.get("service_type", "preventif"), 0) + 1
    result = {"by_type": by_type, "services": [strip_cost(s, user) for s in services]}
    return result


# ------------------------------------------------------------------ seeding
async def seed_admin():
    admin_username = os.environ["ADMIN_USERNAME"].strip().lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"username": admin_username})
    if existing is None:
        await db.users.insert_one({"username": admin_username, "password_hash": hash_password(admin_password),
                                   "name": "Administrator", "role": "admin", "token_version": 0,
                                   "created_at": now_iso()})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"username": admin_username},
                                  {"$set": {"password_hash": hash_password(admin_password)}})
    # viewer test account
    if await db.users.find_one({"username": "operator"}) is None:
        await db.users.insert_one({"username": "operator",
                                   "password_hash": hash_password("Operator#2026"),
                                   "name": "Operator Produksi", "role": "user", "token_version": 0,
                                   "created_at": now_iso()})


async def seed_data():
    if await db.machines.count_documents({}) > 0:
        return
    mids = [str(uuid.uuid4()) for _ in range(4)]
    machines = [
        {"id": mids[0], "code": "MCH-CNC-01", "name": "CNC Milling Deckel Maho", "type": "CNC Milling",
         "location": "Line A", "purchase_date": "2021-03-10", "status": "operasional", "notes": "Presisi tinggi"},
        {"id": mids[1], "code": "MCH-CMP-02", "name": "Compressor Screw Atlas Copco", "type": "Kompresor Udara",
         "location": "Utility", "purchase_date": "2019-07-22", "status": "perawatan", "notes": "Servis rutin 500 jam"},
        {"id": mids[2], "code": "MCH-BLR-03", "name": "Boiler Stoker 10 Ton", "type": "Boiler",
         "location": "Power House", "purchase_date": "2018-01-05", "status": "operasional", "notes": ""},
        {"id": mids[3], "code": "MCH-INJ-04", "name": "Injection Molding KraussMaffei", "type": "Injection Molding",
         "location": "Line B", "purchase_date": "2022-11-30", "status": "rusak", "notes": "Heater zone 2 error"},
    ]
    for m in machines:
        m["created_at"] = now_iso()
    await db.machines.insert_many(machines)

    tids = [str(uuid.uuid4()) for _ in range(3)]
    techs = [
        {"id": tids[0], "name": "Budi Santoso", "specialty": "Lead Mekanik", "phone": "0812-1111-2222", "status": "tersedia"},
        {"id": tids[1], "name": "Agus Setiawan", "specialty": "Teknisi Listrik", "phone": "0813-3333-4444", "status": "bertugas"},
        {"id": tids[2], "name": "Dedi Kurniawan", "specialty": "Hidrolik & Pneumatik", "phone": "0814-5555-6666", "status": "tersedia"},
    ]
    for t in techs:
        t["created_at"] = now_iso()
    await db.technicians.insert_many(techs)

    parts = [
        {"id": str(uuid.uuid4()), "code": "SP-ORG-01", "name": "O-Ring Viton", "category": "Seal",
         "stock": 4, "min_stock": 10, "unit": "pcs", "location": "Rak A1", "price": 15000},
        {"id": str(uuid.uuid4()), "code": "SP-BRG-02", "name": "Bearing SKF 6205", "category": "Bearing",
         "stock": 25, "min_stock": 8, "unit": "pcs", "location": "Rak B2", "price": 85000},
        {"id": str(uuid.uuid4()), "code": "SP-OIL-03", "name": "Hydraulic Oil ISO VG 46", "category": "Pelumas",
         "stock": 6, "min_stock": 12, "unit": "liter", "location": "Rak C1", "price": 45000},
        {"id": str(uuid.uuid4()), "code": "SP-FLT-04", "name": "Filter Udara Heavy Duty", "category": "Filter",
         "stock": 18, "min_stock": 6, "unit": "pcs", "location": "Rak A3", "price": 120000},
    ]
    for p in parts:
        p["created_at"] = now_iso()
    await db.spareparts.insert_many(parts)

    today = date.today()
    schedules = [
        {"id": str(uuid.uuid4()), "machine_id": mids[0], "machine_name": machines[0]["name"],
         "maintenance_type": "Pelumasan & Kalibrasi", "due_date": (today + timedelta(days=2)).isoformat(),
         "frequency": "bulanan", "technician_id": tids[0], "technician_name": "Budi Santoso",
         "status": "terjadwal", "notes": ""},
        {"id": str(uuid.uuid4()), "machine_id": mids[1], "machine_name": machines[1]["name"],
         "maintenance_type": "Ganti Filter & Cek Tekanan", "due_date": (today - timedelta(days=1)).isoformat(),
         "frequency": "mingguan", "technician_id": tids[1], "technician_name": "Agus Setiawan",
         "status": "jatuh_tempo", "notes": "Sudah lewat jatuh tempo"},
        {"id": str(uuid.uuid4()), "machine_id": mids[2], "machine_name": machines[2]["name"],
         "maintenance_type": "Inspeksi Boiler", "due_date": (today + timedelta(days=15)).isoformat(),
         "frequency": "bulanan", "technician_id": tids[0], "technician_name": "Budi Santoso",
         "status": "terjadwal", "notes": ""},
    ]
    for s in schedules:
        s["created_at"] = now_iso()
    await db.schedules.insert_many(schedules)

    services = [
        {"id": str(uuid.uuid4()), "machine_id": mids[3], "machine_name": machines[3]["name"],
         "date": (today - timedelta(days=5)).isoformat(), "service_type": "perbaikan",
         "problem": "Heater zone 2 tidak panas", "action": "Ganti heater band dan thermocouple",
         "technician_id": tids[1], "technician_name": "Agus Setiawan", "operator_name": "Rahmat",
         "used_parts": [], "cost": 850000, "status": "selesai",
         "operator_signature": "", "technician_signature": ""},
        {"id": str(uuid.uuid4()), "machine_id": mids[0], "machine_name": machines[0]["name"],
         "date": (today - timedelta(days=20)).isoformat(), "service_type": "preventif",
         "problem": "Perawatan rutin bulanan", "action": "Pelumasan, cek backlash, kalibrasi",
         "technician_id": tids[0], "technician_name": "Budi Santoso", "operator_name": "Sutrisno",
         "used_parts": [], "cost": 300000, "status": "selesai",
         "operator_signature": "", "technician_signature": ""},
    ]
    for s in services:
        s["created_at"] = now_iso()
    await db.services.insert_many(services)


async def seed_templates():
    if await db.checksheet_templates.count_documents({}) > 0:
        return
    templates = [
        {"id": str(uuid.uuid4()), "name": "Checksheet Umum Mesin Produksi", "machine_type": "Umum",
         "items": [
             {"item": "Tekanan oli pelumas", "unit": "bar", "std_min": "2", "std_max": "5"},
             {"item": "Suhu bearing", "unit": "°C", "std_min": "40", "std_max": "80"},
             {"item": "Getaran/vibrasi", "unit": "mm/s", "std_min": "0", "std_max": "4.5"},
             {"item": "Kekencangan baut pondasi", "unit": "", "std_min": "", "std_max": ""},
             {"item": "Kebersihan area mesin", "unit": "", "std_min": "", "std_max": ""},
             {"item": "Kebocoran oli/pelumas", "unit": "", "std_min": "", "std_max": ""},
         ]},
        {"id": str(uuid.uuid4()), "name": "Checksheet Kompresor Udara", "machine_type": "Kompresor Udara",
         "items": [
             {"item": "Tekanan kerja", "unit": "bar", "std_min": "6", "std_max": "8"},
             {"item": "Suhu discharge", "unit": "°C", "std_min": "60", "std_max": "95"},
             {"item": "Level oli kompresor", "unit": "", "std_min": "", "std_max": ""},
             {"item": "Kondisi filter udara", "unit": "", "std_min": "", "std_max": ""},
             {"item": "Fungsi safety valve", "unit": "", "std_min": "", "std_max": ""},
         ]},
    ]
    for t in templates:
        t["created_at"] = now_iso()
    await db.checksheet_templates.insert_many(templates)


@app.on_event("startup")
async def startup():
    await db.users.create_index("username", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.machines.create_index("id", unique=True)
    await db.spareparts.create_index("id", unique=True)
    await db.technicians.create_index("id", unique=True)
    await db.schedules.create_index("id", unique=True)
    await db.services.create_index("id", unique=True)
    await db.checksheet_templates.create_index("id", unique=True)
    await seed_admin()
    await seed_data()
    await seed_templates()
    logger.info("SIMIN startup complete")


@api.get("/")
async def root():
    return {"message": "SIMIN API"}


app.include_router(api)

_cors_env = os.environ.get("CORS_ORIGINS", "*").strip()
if _cors_env and _cors_env != "*":
    _allow_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    _allow_origins = []
for _extra in [FRONTEND_URL, "http://localhost:3000"]:
    if _extra and _extra not in _allow_origins:
        _allow_origins.append(_extra)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
