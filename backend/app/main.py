from __future__ import annotations

import asyncio
import hashlib
import io
import random
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

app = FastAPI(title="Credit Card Fraud Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class Transaction:
    id: str
    timestamp: str
    txn_id: str
    merchant: str
    amount: float
    location: str
    device: str

    # Model outputs / decisioning
    probability: float
    risk_score: int
    reason_codes: List[str]
    is_high_risk: bool
    status: str  # pending | blocked | approved | proof_requested


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


MERCHANTS = [
    "Acme Retail",
    "Northwind Grocers",
    "CloudKicks Shoes",
    "Orbit Travel",
    "BrightMart Electronics",
    "Quanta Pharmacy",
    "Summit Fuel",
]

LOCATIONS = ["New York", "San Francisco", "London", "Berlin", "Toronto", "Mumbai", "Moscow", "Dubai"]
DEVICES = ["iPhone 15", "Android Pixel 8", "Samsung Galaxy S23", "MacBook Pro", "Windows Laptop"]

REASON_POOL = [
    "unusual_location",
    "velocity_check_failed",
    "device_mismatch",
    "device_anomaly",
    "amount_zscore_high",
    "merchant_risk_high",
    "odd_transaction_time",
    "recent_chargeback_risk",
]


recent_transactions: List[Dict[str, Any]] = []
MAX_RECENT = 200


def _stable_rng(seed_str: str) -> random.Random:
    # Deterministic randomness per txn id (for consistent demo behavior)
    h = hashlib.sha256(seed_str.encode("utf-8")).hexdigest()
    seed_int = int(h[:16], 16)
    return random.Random(seed_int)


def _generate_txn(rng: random.Random, when: datetime) -> Transaction:
    merchant = rng.choice(MERCHANTS)
    location = rng.choice(LOCATIONS)
    device = rng.choice(DEVICES)
    base_amount = rng.uniform(15, 2200)

    # Add a few realistic “burst”/outlier patterns
    if rng.random() < 0.08:
        base_amount *= rng.uniform(2.5, 4.5)
    if rng.random() < 0.05:
        location = rng.choice(["Moscow", "Dubai", "Mumbai"])

    amount = round(base_amount, 2)
    txn_id = f"txn_{rng.randint(10_000, 99_999)}_{int(when.timestamp())}"
    ts_iso = _to_iso(when)
    hour = when.astimezone(timezone.utc).hour

    # Probability + reasons (mocked model/predict)
    # This is deterministic from txn_id for demo stability.
    prob = rng.random()
    if amount > 900:
        prob = min(0.98, prob + 0.25)
    if location in ["Moscow", "Dubai", "Mumbai"]:
        prob = min(0.99, prob + 0.18)
    if hour < 5 or hour > 22:
        prob = min(0.99, prob + 0.12)

    prob = round(float(prob), 4)
    risk_score = int(round(prob * 100))

    reason_codes: List[str] = []
    # Pick 2-4 reasons
    reason_count = 2 + int(rng.random() * 3)
    rng.shuffle(REASON_POOL)
    for rc in REASON_POOL[:reason_count]:
        reason_codes.append(rc)

    is_high_risk = True  # decided by strictness outside
    status = "pending"
    return Transaction(
        id=hashlib.md5(txn_id.encode("utf-8")).hexdigest(),
        timestamp=ts_iso,
        txn_id=txn_id,
        merchant=merchant,
        amount=amount,
        location=location,
        device=device,
        probability=prob,
        risk_score=risk_score,
        reason_codes=reason_codes,
        is_high_risk=is_high_risk,
        status=status,
    )


def _should_block(probability: float, strictness: float) -> bool:
    return probability >= strictness


async def _event_generator(strictness: float) -> AsyncGenerator[Dict[str, Any], None]:
    rng = random.Random(int(time.time()))
    now = _utc_now()

    # Seed a 24h history so the KPI chart has meaningful data immediately.
    history_start = now - timedelta(hours=24)
    history_count = 140
    for i in range(history_count):
        when = history_start + timedelta(seconds=int(i * ((now - history_start).total_seconds() / history_count)))
        txn_rng = _stable_rng(f"{i}-{when.isoformat()}")
        txn = _generate_txn(txn_rng, when)
        txn.is_high_risk = _should_block(txn.probability, strictness)
        txn.status = "blocked" if txn.is_high_risk else "approved"
        recent_transactions.append(asdict(txn))
        if len(recent_transactions) > MAX_RECENT:
            del recent_transactions[: len(recent_transactions) - MAX_RECENT]
        yield asdict(txn)
        await asyncio.sleep(0.015)

    # Real-time loop
    while True:
        when = _utc_now()
        txn_rng = _stable_rng(f"rt-{when.timestamp()}-{rng.randint(0, 999999)}")
        txn = _generate_txn(txn_rng, when)
        txn.is_high_risk = _should_block(txn.probability, strictness)
        txn.status = "blocked" if txn.is_high_risk else "approved"
        recent_transactions.append(asdict(txn))
        if len(recent_transactions) > MAX_RECENT:
            del recent_transactions[: len(recent_transactions) - MAX_RECENT]
        yield asdict(txn)
        await asyncio.sleep(1.0)


@app.get("/api/transactions/stream")
async def stream_transactions(strictness: float = 0.6) -> EventSourceResponse:
    strictness = float(strictness)
    strictness = max(0.0, min(1.0, strictness))

    async def gen() -> AsyncGenerator[Dict[str, Any], None]:
        # sse-starlette supports sending data dicts (it will JSON encode)
        async for item in _event_generator(strictness):
            yield item

    return EventSourceResponse(gen())


@app.post("/api/model/predict")
async def model_predict(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Mocked model inference.
    Returns a probability score and reason codes. In the stream endpoint, we inline this logic.
    """
    txn_id = str(payload.get("txn_id") or payload.get("id") or "unknown")
    rng = _stable_rng(txn_id)

    base_amount = float(payload.get("amount") or 0)
    location = str(payload.get("location") or "")
    device = str(payload.get("device") or "")
    hour = 12
    try:
        ts = str(payload.get("timestamp") or payload.get("time") or "")
        if ":" in ts:
            hour = int(ts.split(":")[0])
    except Exception:
        hour = 12

    prob = rng.random()
    if base_amount > 900:
        prob = min(0.98, prob + 0.25)
    if location in ["Moscow", "Dubai", "Mumbai"]:
        prob = min(0.99, prob + 0.18)
    if hour < 5 or hour > 22:
        prob = min(0.99, prob + 0.12)
    if "Windows" in device:
        prob = min(0.99, prob + 0.05)

    prob = round(float(prob), 4)
    risk_score = int(round(prob * 100))

    reason_count = 2 + int(rng.random() * 3)
    rng.shuffle(REASON_POOL)
    reason_codes = REASON_POOL[:reason_count]
    return {
        "probability": prob,
        "risk_score": risk_score,
        "reason_codes": reason_codes,
    }


def _predict_from_input(seed_key: str, amount: float, location: str, device: str, timestamp: str) -> Dict[str, Any]:
    rng = _stable_rng(seed_key)

    hour = 12
    try:
        ts = str(timestamp or "")
        if "T" in ts:
            hour = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc).hour
        elif ":" in ts:
            hour = int(ts.split(":")[0])
    except Exception:
        hour = 12

    prob = rng.random()
    if amount > 900:
        prob = min(0.98, prob + 0.25)
    if location in ["Moscow", "Dubai", "Mumbai"]:
        prob = min(0.99, prob + 0.18)
    if hour < 5 or hour > 22:
        prob = min(0.99, prob + 0.12)
    if "Windows" in device:
        prob = min(0.99, prob + 0.05)

    prob = round(float(prob), 4)
    risk_score = int(round(prob * 100))

    reason_count = 2 + int(rng.random() * 3)
    rng.shuffle(REASON_POOL)
    reason_codes = REASON_POOL[:reason_count]
    return {
        "probability": prob,
        "risk_score": risk_score,
        "reason_codes": reason_codes,
    }


@app.post("/api/transactions/submit")
async def transactions_submit(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Accept user-provided transaction fields and return a risk-scored decision.
    This endpoint is the backbone for a "no fake history" hackathon flow:
    only user submissions are persisted into recent_transactions for OCR matching.
    """
    merchant = str(payload.get("merchant") or "Unknown merchant")
    location = str(payload.get("location") or "Unknown")
    device = str(payload.get("device") or "Unknown device")
    amount = float(payload.get("amount") or 0)
    strictness = float(payload.get("strictness") if payload.get("strictness") is not None else 0.6)
    strictness = max(0.0, min(1.0, strictness))

    timestamp_raw = payload.get("timestamp") or _utc_now().isoformat()
    timestamp_dt: datetime
    try:
        timestamp_dt = datetime.fromisoformat(str(timestamp_raw).replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        timestamp_dt = _utc_now()

    seed_key = f"{merchant}|{location}|{device}|{amount}|{timestamp_dt.isoformat()}"
    pred = _predict_from_input(seed_key, amount, location, device, timestamp_dt.isoformat())

    probability = float(pred["probability"])
    is_high_risk = probability >= strictness
    risk_score = int(pred["risk_score"])
    reason_codes: List[str] = list(pred["reason_codes"])

    txn_id = f"txn_{abs(hash(seed_key)) % 100000000}"
    status = "blocked" if is_high_risk else "approved"

    txn = Transaction(
        id=hashlib.md5(txn_id.encode("utf-8")).hexdigest(),
        timestamp=_to_iso(timestamp_dt),
        txn_id=txn_id,
        merchant=merchant,
        amount=round(amount, 2),
        location=location,
        device=device,
        probability=probability,
        risk_score=risk_score,
        reason_codes=reason_codes,
        is_high_risk=is_high_risk,
        status=status,
    )

    recent_transactions.append(asdict(txn))
    if len(recent_transactions) > MAX_RECENT:
        del recent_transactions[: len(recent_transactions) - MAX_RECENT]

    return asdict(txn)


@app.post("/api/ocr/extract")
async def ocr_extract(
    file: UploadFile = File(...),
    txId: Optional[str] = Form(None),
) -> Dict[str, Any]:
    """
    Mock OCR extraction. Simulates 2-second processing delay.
    Returns a structured receipt extract that matches a recent transaction.
    """
    _ = await file.read()  # consume upload (we don't actually parse in this mocked version)
    await asyncio.sleep(2.0)

    # Prefer matching to an existing flagged transaction if txId provided.
    candidate = None
    if txId:
        for t in reversed(recent_transactions):
            if str(t.get("txn_id")) == str(txId) or str(t.get("id")) == str(txId):
                candidate = t
                break

    if candidate is None:
        candidate = recent_transactions[-1] if recent_transactions else None

    merchant = str(candidate.get("merchant") if candidate else "Acme Retail")
    timestamp = str(candidate.get("timestamp") if candidate else _to_iso(_utc_now()))
    amount = float(candidate.get("amount") if candidate else 123.45)

    extracted_date = datetime.fromisoformat(timestamp.replace("Z", "+00:00")).date().isoformat()

    extracted_text = f"Merchant: {merchant}\nDate: {extracted_date}\nTotal: {amount:.2f}\n"

    # mock confidence: higher if it “looks like” a scan (by file name heuristics)
    fname = (file.filename or "").lower()
    conf = 88
    if "blur" in fname or "low" in fname:
        conf = 62

    return {
        "merchantName": merchant,
        "date": extracted_date,
        "totalAmount": round(amount, 2),
        "confidence": conf,
        "extractedText": extracted_text,
    }


@app.post("/api/transactions/action")
async def transaction_action(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Mock action endpoint: updates in-memory status for the most recent match.
    """
    tx_id = payload.get("txId") or payload.get("txnId") or payload.get("id")
    action = str(payload.get("action") or "").lower()

    status_map = {"block": "blocked", "block_card": "blocked", "blocked": "blocked", "approve": "approved", "approved": "approved", "request_proof": "proof_requested"}
    new_status = status_map.get(action)
    if not new_status or new_status == "proof_requested":
        if action in ["request_proof", "request proof", "proof_requested", "request-proof"]:
            new_status = "proof_requested"
        elif action in ["approve", "approved"]:
            new_status = "approved"
        elif action in ["block", "blocked", "block_card"]:
            new_status = "blocked"
        else:
            new_status = "pending"

    updated = False
    if tx_id:
        for t in reversed(recent_transactions):
            if str(t.get("txn_id")) == str(tx_id) or str(t.get("id")) == str(tx_id):
                t["status"] = new_status
                updated = True
                break

    return {"ok": True, "updated": updated, "status": new_status}

