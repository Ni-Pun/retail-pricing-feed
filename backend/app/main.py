from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.models import PricingRecord, PricingAudit, CsvUpload  # Must import so Base knows about them
from app.routers import uploads, pricing


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs once on startup: creates all DB tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables ready.")
    yield  # App runs here
    # (cleanup code would go after yield if needed)


app = FastAPI(
    title="Retail Pricing Feed API",
    version="1.0.0",
    description="Upload, search, and edit retail store pricing data.",
    lifespan=lifespan,
)

# Allow the Angular frontend (localhost:4200) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(uploads.router)
app.include_router(pricing.router)


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "retail-pricing-feed"}
