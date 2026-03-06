from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime

# Characters that can turn a cell into a formula in Excel — we block them
FORMULA_CHARS = {"=", "+", "-", "@", "|", "%"}


class PricingRecordOut(BaseModel):
    """Shape of a pricing record returned by the API."""
    id:           UUID
    store_id:     str
    sku:          str
    product_name: str
    price:        Decimal
    currency:     str
    price_date:   date
    version:      int
    updated_at:   datetime
    updated_by:   str

    model_config = {"from_attributes": True}  # Allows building from SQLAlchemy model


class PricingRecordUpdate(BaseModel):
    """Fields the user is allowed to change when editing a record."""
    product_name: Optional[str]     = None
    price:        Optional[Decimal] = Field(None, gt=0)
    currency:     Optional[str]     = Field(None, min_length=3, max_length=3)
    version:      int  # Required — used for optimistic locking

    @field_validator("product_name")
    @classmethod
    def block_formula_injection(cls, v: Optional[str]) -> Optional[str]:
        if v and v[0] in FORMULA_CHARS:
            raise ValueError("Product name starts with a disallowed character.")
        return v


class UploadStatusOut(BaseModel):
    """Shape of an upload status record returned by the API."""
    id:             UUID
    filename:       str
    store_id:       str
    status:         str
    total_rows:     Optional[int]
    processed_rows: int
    error_count:    int
    error_detail:   Optional[dict]
    uploaded_at:    datetime
    completed_at:   Optional[datetime]

    model_config = {"from_attributes": True}
