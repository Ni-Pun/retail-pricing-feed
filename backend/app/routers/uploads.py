import csv
import io
import os
import uuid as uuid_module
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database import get_db, AsyncSessionLocal
from app.models import CsvUpload, PricingRecord
from app.schemas import UploadStatusOut

router = APIRouter(prefix="/api/v1/uploads", tags=["uploads"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_SIZE   = 500 * 1024 * 1024        # 500 MB
REQUIRED   = {"store_id", "sku", "product_name", "price", "date"}
FORMULA    = {"=", "+", "-", "@", "|"}

os.makedirs(UPLOAD_DIR, exist_ok=True)


async def _process_csv(upload_id: str, local_path: str):
    """
    Background task: reads the saved CSV, validates every row,
    and upserts valid rows into the pricing_records table.
    Runs after the HTTP response has already been sent to the user.
    """
    async with AsyncSessionLocal() as db:
        # Mark upload as processing
        result = await db.execute(select(CsvUpload).where(CsvUpload.id == upload_id))
        upload = result.scalar_one()
        upload.status = "PROCESSING"
        await db.commit()

        try:
            with open(local_path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)

                # Validate that required columns exist
                headers = {h.strip().lower() for h in (reader.fieldnames or [])}
                missing = REQUIRED - headers
                if missing:
                    raise ValueError(f"Missing columns: {', '.join(sorted(missing))}")

                rows, errors = [], []

                for i, row in enumerate(reader, start=2):  # start=2 because row 1 is headers
                    try:
                        price_str = row.get("price", "").strip()
                        price = float(price_str)
                        if price < 0:
                            raise ValueError("Price cannot be negative")

                        name = row.get("product_name", "").strip()
                        if name and name[0] in FORMULA:
                            raise ValueError("Formula injection detected in product_name")

                        currency = row.get("currency", "USD").strip()
                        if not currency:
                            currency = "USD"

                        rows.append({
                            "store_id":     row["store_id"].strip()[:20],
                            "sku":          row["sku"].strip()[:50],
                            "product_name": name[:255],
                            "price":        price,
                            "price_date":   datetime.strptime(row["date"].strip(), "%Y-%m-%d").date(),
                            "currency":     currency[:3].upper(),
                            "created_by":   "demo-user",
                            "updated_by":   "demo-user",
                        })
                    except Exception as e:
                        errors.append({"row": i, "error": str(e)})

            upload.total_rows = len(rows) + len(errors)

            # Upsert in batches of 500
            # ON CONFLICT = if the same store+sku+date already exists, update it
            BATCH = 500
            for start in range(0, len(rows), BATCH):
                batch = rows[start: start + BATCH]
                stmt = pg_insert(PricingRecord).values(batch)
                stmt = stmt.on_conflict_do_update(
                    constraint="uq_store_sku_date",
                    set_={
                        "product_name": stmt.excluded.product_name,
                        "price":        stmt.excluded.price,
                        "currency":     stmt.excluded.currency,
                        "updated_by":   stmt.excluded.updated_by,
                        "version":      PricingRecord.version + 1,
                    }
                )
                await db.execute(stmt)
                upload.processed_rows += len(batch)
                await db.commit()

            upload.status       = "DONE"
            upload.error_count  = len(errors)
            upload.error_detail = {"errors": errors[:50]}  # Store first 50 errors max
            upload.completed_at = datetime.utcnow()
            await db.commit()

        except Exception as exc:
            upload.status       = "FAILED"
            upload.error_detail = {"message": str(exc)}
            upload.completed_at = datetime.utcnow()
            await db.commit()


@router.post("/", status_code=202)
async def upload_csv(
    background_tasks: BackgroundTasks,
    file:     UploadFile = File(...),
    store_id: str        = Form(...),
    db:       AsyncSession = Depends(get_db),
):
    """Accept a CSV file, save it to disk, and kick off background processing."""

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    content = await file.read()

    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 500 MB limit.")

    # Save to disk with a unique name so filenames never collide
    safe_name  = f"{uuid_module.uuid4()}_{file.filename}"
    local_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(local_path, "wb") as f:
        f.write(content)

    # Create upload tracking record in DB
    record = CsvUpload(
        filename   = file.filename,
        local_path = local_path,
        store_id   = store_id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    # Process the CSV after the response is returned
    background_tasks.add_task(_process_csv, str(record.id), local_path)

    return {"upload_id": str(record.id), "status": "QUEUED"}


@router.get("/{upload_id}/status", response_model=UploadStatusOut)
async def get_upload_status(upload_id: str, db: AsyncSession = Depends(get_db)):
    """Poll this endpoint to check progress of an upload."""
    result = await db.execute(select(CsvUpload).where(CsvUpload.id == upload_id))
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found.")
    return upload
