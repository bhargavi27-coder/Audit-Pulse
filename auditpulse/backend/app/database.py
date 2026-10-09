"""
Database setup with SQLAlchemy async engine
pgvector-ready architecture
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
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
    """Create all tables on startup and apply light migrations if needed."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # In SQLite, dynamically ensure newly added columns exist in tables
        if is_sqlite:
            # Check findings columns
            columns_to_add = [
                ("findings", "risk_score", "REAL DEFAULT 0.0"),
                ("findings", "suggested_fix", "JSON"),
                ("findings", "evidence_pair", "JSON"),
                ("findings", "reviewed_by", "VARCHAR(255)"),
                ("findings", "reviewer_role", "VARCHAR(100)"),
                ("findings", "review_decision", "VARCHAR(50)"),
                ("findings", "review_notes", "TEXT"),
                ("findings", "reviewed_at", "DATETIME"),
                ("policies", "parent_policy_id", "INTEGER"),
                ("policies", "version_notes", "TEXT"),
                ("vendors", "affected_components", "JSON"),
            ]

            for table, col, col_type in columns_to_add:
                try:
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};"))
                except Exception:
                    # Column already exists or table doesn't support ALTER
                    pass
