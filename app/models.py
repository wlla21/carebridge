from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from datetime import datetime

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(191), unique=True, nullable=False, index=True)
    age = Column(Integer, nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="user")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class HealthScreening(Base):
    __tablename__ = "health_screenings"

    id = Column(Integer, primary_key=True, index=True)

    stress_level = Column(String(20), nullable=True)

    sleep_problem = Column(Boolean, nullable=True)

    physical_symptoms = Column(Text, nullable=True)

    pain_level = Column(Integer, nullable=True)

    concentration_problem = Column(Boolean, nullable=True)

    daily_functioning = Column(Text, nullable=True)

    support_recommended = Column(Boolean, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    prompt = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)
    situation_summary = Column(Text, nullable=True)
    urgency = Column(String(20), nullable=True)
    support_type = Column(String(100), nullable=True)
    recommended_next_steps = Column(Text, nullable=True)
    conversation_title = Column(String(160), nullable=True)
    wellbeing_level = Column(String(20), nullable=True)
    trend = Column(String(20), nullable=True)
    topic = Column(String(100), nullable=True)
    positive_progress = Column(Text, nullable=True)
    attention_area = Column(Text, nullable=True)
    suggestions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)