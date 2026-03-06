from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import PricingAudit, PricingRecord
from app.schemas import PricingRecordOut, PricingRecordUpdate

router = APIRouter(prefix="/api/v1/pricing", tags=["pricing"])


@router.get("/")
async def search_pricing(
    store_id:     Optional[str]     = Query(None, description="Filter by store ID (partial match)"),
    sku:          Optional[str]     = Query(None, description="Filter by SKU (partial match)"),
    product_name: Optional[str]     = Query(None, description="Filter by product name (partial match)"),
    price_min:    Optional[Decimal] = Query(None, description="Minimum price"),
    price_max:    Optional[Decimal] = Query(None, description="Maximum price"),
    date_from:    Optional[date]    = Query(None, description="Earliest price date (YYYY-MM-DD)"),
    date_to:      Optional[date]    = Query(None, description="Latest price date (YYYY-MM-DD)"),
    limit:        int               = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
):
    """Search pricing records with optional filters. Returns up to `limit` records."""

    filters = []
    if store_id:     filters.append(PricingRecord.store_id.ilike(f"%{store_id}%"))
    if sku:          filters.append(PricingRecord.sku.ilike(f"%{sku}%"))
    if product_name: filters.append(PricingRecord.product_name.ilike(f"%{product_name}%"))
    if price_min:    filters.append(PricingRecord.price >= price_min)
    if price_max:    filters.append(PricingRecord.price <= price_max)
    if date_from:    filters.append(PricingRecord.price_date >= date_from)
    if date_to:      filters.append(PricingRecord.price_date <= date_to)

    stmt = (
        select(PricingRecord)
        .where(and_(*filters) if filters else True)
        .order_by(PricingRecord.updated_at.desc())
        .limit(limit + 1)   # Fetch one extra to know if there are more pages
    )

    result  = await db.execute(stmt)
    records = result.scalars().all()

    has_more = len(records) > limit
    return {
        "items":    [PricingRecordOut.model_validate(r) for r in records[:limit]],
        "has_more": has_more,
        "count":    min(len(records), limit),
    }


@router.get("/{record_id}", response_model=PricingRecordOut)
async def get_record(record_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single pricing record by its ID."""
    result = await db.execute(select(PricingRecord).where(PricingRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")
    return record


@router.put("/{record_id}", response_model=PricingRecordOut)
async def update_record(
    record_id: str,
    payload:   PricingRecordUpdate,
    db:        AsyncSession = Depends(get_db),
):
    """
    Update a pricing record.
    Requires the current `version` number to prevent overwriting
    someone else's changes (optimistic locking).
    """
    result = await db.execute(select(PricingRecord).where(PricingRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")

    # Optimistic locking: reject if versions don't match
    if record.version != payload.version:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Version conflict: the record was updated by someone else. "
                f"DB version: {record.version}, your version: {payload.version}. "
                f"Please reload the record and try again."
            ),
        )

    # Snapshot old data for audit trail
    old_data = PricingRecordOut.model_validate(record).model_dump(mode="json")

    # Apply changes
    if payload.product_name is not None: record.product_name = payload.product_name
    if payload.price        is not None: record.price        = payload.price
    if payload.currency     is not None: record.currency     = payload.currency
    record.version    += 1
    record.updated_at  = datetime.utcnow()
    record.updated_by  = "demo-user"

    # Write audit entry
    new_data = PricingRecordOut.model_validate(record).model_dump(mode="json")
    audit = PricingAudit(
        record_id = record.id,
        action    = "UPDATE",
        old_data  = old_data,
        new_data  = new_data,
        actor     = "demo-user",
    )
    db.add(audit)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/{record_id}/audit")
async def get_audit_history(record_id: str, db: AsyncSession = Depends(get_db)):
    """Get the full edit history for a pricing record."""
    result = await db.execute(
        select(PricingAudit)
        .where(PricingAudit.record_id == record_id)
        .order_by(PricingAudit.acted_at.desc())
    )
    return result.scalars().all()
