"""
Database setup with SQLAlchemy async engine
pgvector-ready architecture
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

is_sqlite = "sqlite" in settings.database_url
engine_kwargs = {
    "echo": settings.app_env == "development",
}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    })

# Async engine
engine = create_async_engine(
    settings.database_url,
    **engine_kwargs,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    pass


async def get_db() -> AsyncSession:
    """Dependency: yields a database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Create all tables on startup"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
