from pathlib import Path
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

raw_database_url = (os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL") or "").strip()
if not raw_database_url:
    raise RuntimeError(
        "DATABASE_URL is not configured. Add a PostgreSQL or MySQL SQLAlchemy URL."
    )

if raw_database_url.startswith("mysql://"):
    raw_database_url = f"mysql+pymysql://{raw_database_url[len('mysql://'):]}"
elif raw_database_url.startswith("postgres://"):
    raw_database_url = f"postgresql+psycopg2://{raw_database_url[len('postgres://'):]}"

try:
    database_url = make_url(raw_database_url)
except ArgumentError as error:
    raise RuntimeError(
        "DATABASE_URL is invalid. Use a PostgreSQL or MySQL SQLAlchemy URL."
    ) from error

engine = create_engine(database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
