import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv() # reads values from.env file

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/pricing_db"
)

engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    echo=True,
)

AsyncSessionLocal =sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase) :
    pass

# This function is called by FastAPI for every request
# It opens a DB session, gives it to the route, then closes it

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
