import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Numeric, Date, Integer, DateTime, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PricingRecord(Base):
    """One pricing record = one store/SKU/date combination."""
    __tablename__ = "pricing_records"
    __table_args__ = (
        # Prevents duplicate rows for same store + SKU + date
        UniqueConstraint("store_id", "sku", "price_date", name="uq_store_sku_date"),
    )

    id:           Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id:     Mapped[str]       = mapped_column(String(20),  nullable=False, index=True)
    sku:          Mapped[str]       = mapped_column(String(50),  nullable=False, index=True)
    product_name: Mapped[str]       = mapped_column(String(255), nullable=False)
    price:        Mapped[Decimal]   = mapped_column(Numeric(12, 4), nullable=False)
    currency:     Mapped[str]       = mapped_column(String(3),   nullable=False, default="USD")
    price_date:   Mapped[date]      = mapped_column(Date,        nullable=False, index=True)
    version:      Mapped[int]       = mapped_column(Integer,     nullable=False, default=1)
    created_at:   Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at:   Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by:   Mapped[str]       = mapped_column(String(100), nullable=False, default="demo-user")
    updated_by:   Mapped[str]       = mapped_column(String(100), nullable=False, default="demo-user")


class PricingAudit(Base):
    """Every edit to a PricingRecord is logged here."""
    __tablename__ = "pricing_audit"

    id:        Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    action:    Mapped[str]       = mapped_column(String(10),  nullable=False)  # UPDATE
    old_data:  Mapped[dict]      = mapped_column(JSON, nullable=True)
    new_data:  Mapped[dict]      = mapped_column(JSON, nullable=True)
    actor:     Mapped[str]       = mapped_column(String(100), nullable=False)
    acted_at:  Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class CsvUpload(Base):
    """Tracks every CSV file upload and its processing status."""
    __tablename__ = "csv_uploads"

    id:             Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename:       Mapped[str]       = mapped_column(String(255), nullable=False)
    local_path:     Mapped[str]       = mapped_column(String(512), nullable=False)
    store_id:       Mapped[str]       = mapped_column(String(20),  nullable=False)
    uploaded_by:    Mapped[str]       = mapped_column(String(100), nullable=False, default="demo-user")
    status:         Mapped[str]       = mapped_column(String(20),  nullable=False, default="QUEUED")
    total_rows:     Mapped[int]       = mapped_column(Integer, nullable=True)
    processed_rows: Mapped[int]       = mapped_column(Integer, default=0)
    error_count:    Mapped[int]       = mapped_column(Integer, default=0)
    error_detail:   Mapped[dict]      = mapped_column(JSON, nullable=True)
    uploaded_at:    Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at:   Mapped[datetime]  = mapped_column(DateTime(timezone=True), nullable=True)
