from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

raw_database_url = (os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL") or "").strip()
if not raw_database_url:
    raise RuntimeError(
        "DATABASE_URL is not configured. Add a MySQL SQLAlchemy URL to the Render environment variables."
    )

if raw_database_url.startswith("mysql://"):
    raw_database_url = f"mysql+pymysql://{raw_database_url[len('mysql://'):]}"

try:
    DATABASE_URL = make_url(raw_database_url)
except ArgumentError as error:
    raise RuntimeError(
        "DATABASE_URL is invalid. Use mysql+pymysql://USER:PASSWORD@HOST:3306/DATABASE."
    ) from error

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()