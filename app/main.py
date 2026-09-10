from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import inspect, text
import json
import os
import hashlib
import hmac
import secrets
import time
import base64
from pathlib import Path

from .database import Base, SessionLocal, engine
from .models import AIAnalysis, User

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

auth_secret = os.getenv("AUTH_SECRET", "").strip()
if not auth_secret:
    raise RuntimeError(
        "AUTH_SECRET is not configured. Add it to the backend .env file and restart the server."
    )

app = FastAPI()

Base.metadata.create_all(bind=engine)

analysis_columns = {
    column["name"] for column in inspect(engine).get_columns("ai_analyses")
}
with engine.begin() as connection:
    database_dialect = engine.dialect.name
    if "user_id" not in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses ADD COLUMN user_id INTEGER NULL"))
    if database_dialect == "mysql":
        if "prompt" in analysis_columns:
            connection.execute(text("ALTER TABLE ai_analyses MODIFY COLUMN prompt TEXT NULL"))
        if "answer" in analysis_columns:
            connection.execute(text("ALTER TABLE ai_analyses MODIFY COLUMN answer TEXT NULL"))
    elif database_dialect == "postgresql":
        if "prompt" in analysis_columns:
            connection.execute(text("ALTER TABLE ai_analyses ALTER COLUMN prompt DROP NOT NULL"))
        if "answer" in analysis_columns:
            connection.execute(text("ALTER TABLE ai_analyses ALTER COLUMN answer DROP NOT NULL"))
    if "situation_summary" not in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses ADD COLUMN situation_summary TEXT NULL"))
    if "urgency" not in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses ADD COLUMN urgency VARCHAR(20) NULL"))
    if "support_type" not in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses ADD COLUMN support_type VARCHAR(100) NULL"))
    if "recommended_next_steps" not in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses ADD COLUMN recommended_next_steps TEXT NULL"))
    for column, definition in {
        "conversation_title": "VARCHAR(160) NULL",
        "wellbeing_level": "VARCHAR(20) NULL",
        "trend": "VARCHAR(20) NULL",
        "topic": "VARCHAR(100) NULL",
        "positive_progress": "TEXT NULL",
        "attention_area": "TEXT NULL",
        "suggestions": "TEXT NULL",
    }.items():
        if column not in analysis_columns:
            connection.execute(text(f"ALTER TABLE ai_analyses ADD COLUMN {column} {definition}"))

groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key) if groq_api_key else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_URLS",
            "http://localhost:5173,http://127.0.0.1:5173,https://carebridge-irih.vercel.app",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PromptRequest(BaseModel):
    prompt: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    age: int | None = None
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


DEMO_USERS = [
    {
        "username": "Demo Income Support",
        "email": "demo-income@example.com",
        "password": "Demo12345!",
        "age": 42,
        "topic": "Income and employment",
        "title": "Worry about income after job loss",
        "summary": "The resident reported losing work recently and feeling worried about meeting household expenses.",
        "wellbeing": "moderate",
        "trend": "stable",
        "support_type": "Income and employment support",
        "next_steps": "Explore employment and financial support options with a support worker.",
        "positive_progress": "Reached out for support and is considering next steps.",
        "attention_area": "Financial pressure and uncertainty about employment.",
        "suggestions": '["Explore local employment support", "Discuss essential expenses with a trusted support person"]',
    },
    {
        "username": "Demo Caregiver Support",
        "email": "demo-caregiver@example.com",
        "password": "Demo12345!",
        "age": 56,
        "topic": "Caregiving",
        "title": "Feeling overwhelmed by caregiving",
        "summary": "The resident described feeling tired while caring for an elderly family member and managing daily responsibilities.",
        "wellbeing": "high",
        "trend": "increasing",
        "support_type": "Caregiver and family support",
        "next_steps": "Consider caregiver support services and schedule time for personal rest.",
        "positive_progress": "Recognised the need for support instead of managing alone.",
        "attention_area": "Stress, fatigue, and limited time for self-care.",
        "suggestions": '["Ask about respite or caregiver support", "Share responsibilities with family where possible"]',
    },
    {
        "username": "Demo Student Wellbeing",
        "email": "demo-student@example.com",
        "password": "Demo12345!",
        "age": 19,
        "topic": "Education and wellbeing",
        "title": "Pressure from studies",
        "summary": "The resident reported study pressure, difficulty concentrating, and concern about keeping up with schoolwork.",
        "wellbeing": "moderate",
        "trend": "improving",
        "support_type": "Student and wellbeing support",
        "next_steps": "Talk with a school support professional and create a manageable study plan.",
        "positive_progress": "Started identifying specific pressures and asking for help.",
        "attention_area": "Concentration difficulties and study-related stress.",
        "suggestions": '["Speak with a school counsellor", "Break school tasks into smaller steps"]',
    },
]


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        salt_value, digest_value = encoded.split("$", 1)
        salt = base64.urlsafe_b64decode(salt_value.encode())
        expected = base64.urlsafe_b64decode(digest_value.encode())
        actual = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def seed_demo_users() -> None:
    db = SessionLocal()
    try:
        for demo in DEMO_USERS:
            user = db.query(User).filter(User.email == demo["email"]).first()
            if user is None:
                user = User(
                    username=demo["username"],
                    email=demo["email"],
                    age=demo["age"],
                    password_hash=hash_password(demo["password"]),
                    role="user",
                )
                db.add(user)
                db.flush()
            else:
                user.username = demo["username"]
                user.age = demo["age"]
                user.role = "user"
                user.password_hash = hash_password(demo["password"])
            if db.query(AIAnalysis).filter(AIAnalysis.user_id == user.id).count() == 0:
                db.add(
                    AIAnalysis(
                        user_id=user.id,
                        prompt=demo["summary"],
                        answer=demo["summary"],
                        conversation_title=demo["title"],
                        situation_summary=demo["summary"],
                        urgency="medium",
                        support_type=demo["support_type"],
                        recommended_next_steps=demo["next_steps"],
                        wellbeing_level=demo["wellbeing"],
                        trend=demo["trend"],
                        topic=demo["topic"],
                        positive_progress=demo["positive_progress"],
                        attention_area=demo["attention_area"],
                        suggestions=demo["suggestions"],
                    )
                )
        db.commit()
    finally:
        db.close()


seed_demo_users()


def get_auth_secret() -> str:
    return auth_secret


def create_token(user: User) -> str:
    payload = f"{user.id}:{user.role}:{int(time.time()) + 60 * 60 * 8}"
    secret = get_auth_secret()
    signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{base64.urlsafe_b64encode(payload.encode()).decode()}.{signature}"


def current_user(authorization: str = Header(default="")) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required.")
    try:
        encoded_payload, signature = authorization[7:].split(".", 1)
        payload = base64.urlsafe_b64decode(encoded_payload.encode()).decode()
        secret = get_auth_secret()
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError
        user_id, _, expires = payload.split(":")
        if int(expires) < int(time.time()):
            raise ValueError
    except (AttributeError, ValueError, TypeError, UnicodeDecodeError):
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User account not found.")
        return user
    finally:
        db.close()


def staff_user(user: User = Depends(current_user)) -> User:
    if user.role not in {"doctor", "service_worker", "admin"}:
        raise HTTPException(status_code=403, detail="Staff access required.")
    return user


class AnalysisResponse(BaseModel):
    id: int
    situation_summary: str
    urgency: str
    support_type: str
    recommended_next_steps: str
    created_at: str


class UserDashboardResponse(BaseModel):
    username: str
    total_conversations: int
    recent_activity: str | None
    wellbeing_status: str
    trend: str
    summary: str
    suggestions: list[str]
    conversations: list[dict]


class AdminUserResponse(BaseModel):
    id: int
    username: str
    status: str
    conversations: int
    wellbeing_status: str
    trend: str
    last_active: str | None


@app.get("/")
def home():
    return {"message": "API is working!"}

@app.get("/db-test")
def database_test():
    try:
        with engine.connect():
            return {"message": "MySQL connected!"}
    except Exception as e:
        return {"error": str(e)}


@app.post("/register")
def register(request: RegisterRequest):
    if len(request.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    db = SessionLocal()
    try:
        if db.query(User).filter(
            (User.email == request.email.lower()) | (User.username == request.username)
        ).first():
            raise HTTPException(status_code=409, detail="Email or username already exists.")
        user = User(
            username=request.username.strip(),
            email=request.email.lower().strip(),
            age=request.age,
            password_hash=hash_password(request.password),
            role="user",
        )
        db.add(user)
        db.commit()
        return {"message": "Account created."}
    finally:
        db.close()


@app.post("/login")
def login(request: LoginRequest):
    if request.email.lower().strip() in {demo["email"] for demo in DEMO_USERS}:
        seed_demo_users()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == request.email.lower().strip()).first()
        if user is None or not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        return {"token": create_token(user), "role": user.role, "username": user.username}
    finally:
        db.close()


@app.post("/ask")
def ask_ai(request: PromptRequest, user: User = Depends(current_user)):
    if not request.prompt.strip():
        raise HTTPException(status_code=422, detail="Prompt cannot be empty.")
    if client is None:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a healthcare support assistant. Analyze the user's message "
                    "without diagnosing. Return JSON with exactly these string fields: "
                    "user_answer, conversation_title, situation_summary, urgency, support_type, "
                    "recommended_next_steps, wellbeing_level, trend, topic, positive_progress, "
                    "attention_area, suggestions. wellbeing_level must be low, moderate, or high; "
                    "trend must be improving, stable, or increasing; suggestions must be a JSON "
                    "array of 2-3 short strings. The situation_summary must be anonymous and "
                    "general: never include names, contact details, exact quotations, or "
                    "identifying details. urgency must be one of low, medium, high, or "
                    "emergency. Keep the user_answer supportive and clear."
                ),
            },
            {"role": "user", "content": request.prompt.strip()},
        ],
    )
    raw_answer = response.choices[0].message.content
    if not raw_answer:
        raise HTTPException(status_code=502, detail="The AI returned an empty response.")
    try:
        result = json.loads(raw_answer)
        answer = result["user_answer"]
        conversation_title = result["conversation_title"]
        situation_summary = result["situation_summary"]
        urgency = result["urgency"].lower()
        support_type = result["support_type"]
        recommended_next_steps = result["recommended_next_steps"]
        wellbeing_level = result["wellbeing_level"].lower()
        trend = result["trend"].lower()
        topic = result["topic"]
        positive_progress = result["positive_progress"]
        attention_area = result["attention_area"]
        suggestions = result["suggestions"]
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=502, detail="The AI returned an invalid analysis.")
    if urgency not in {"low", "medium", "high", "emergency"}:
        raise HTTPException(status_code=502, detail="The AI returned an invalid urgency.")
    if wellbeing_level not in {"low", "moderate", "high"} or trend not in {"improving", "stable", "increasing"}:
        raise HTTPException(status_code=502, detail="The AI returned invalid wellbeing data.")
    if not isinstance(suggestions, list) or not all(isinstance(item, str) for item in suggestions):
        raise HTTPException(status_code=502, detail="The AI returned invalid suggestions.")

    analysis = AIAnalysis(
        user_id=user.id,
        situation_summary=situation_summary,
        urgency=urgency,
        support_type=support_type,
        recommended_next_steps=recommended_next_steps,
        conversation_title=conversation_title,
        wellbeing_level=wellbeing_level,
        trend=trend,
        topic=topic,
        positive_progress=positive_progress,
        attention_area=attention_area,
        suggestions=json.dumps(suggestions[:3]),
    )
    db = SessionLocal()
    try:
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
    except SQLAlchemyError:
        db.rollback()
        raise
    finally:
        db.close()

    return {
        "id": analysis.id,
        "answer": answer,
    }


@app.get("/analyses", response_model=list[AnalysisResponse])
def list_analyses(user: User = Depends(staff_user)):
    db = SessionLocal()
    try:
        analyses = (
            db.query(AIAnalysis)
            .filter(AIAnalysis.situation_summary.is_not(None))
            .order_by(AIAnalysis.created_at.desc())
            .all()
        )
        return [
            AnalysisResponse(
                id=analysis.id,
                situation_summary=analysis.situation_summary,
                urgency=analysis.urgency,
                support_type=analysis.support_type,
                recommended_next_steps=analysis.recommended_next_steps,
                created_at=analysis.created_at.isoformat(),
            )
            for analysis in analyses
        ]
    finally:
        db.close()


def analysis_payload(analysis: AIAnalysis) -> dict:
    return {
        "id": analysis.id,
        "title": analysis.conversation_title or "Wellbeing conversation",
        "summary": analysis.situation_summary,
        "wellbeing": analysis.wellbeing_level or "moderate",
        "trend": analysis.trend or "stable",
        "topic": analysis.topic or "General wellbeing",
        "positive_progress": analysis.positive_progress or "No progress noted yet.",
        "attention_area": analysis.attention_area or "No specific area flagged.",
        "suggestions": json.loads(analysis.suggestions or "[]"),
        "created_at": analysis.created_at.isoformat(),
    }


@app.get("/me/dashboard", response_model=UserDashboardResponse)
def user_dashboard(user: User = Depends(current_user)):
    db = SessionLocal()
    try:
        analyses = (
            db.query(AIAnalysis)
            .filter(AIAnalysis.user_id == user.id, AIAnalysis.situation_summary.is_not(None))
            .order_by(AIAnalysis.created_at.desc())
            .all()
        )
        latest = analyses[0] if analyses else None
        suggestions = []
        for analysis in analyses:
            suggestions.extend(json.loads(analysis.suggestions or "[]"))
        return UserDashboardResponse(
            username=user.username,
            total_conversations=len(analyses),
            recent_activity=latest.created_at.isoformat() if latest else None,
            wellbeing_status=latest.wellbeing_level if latest else "Not enough data",
            trend=latest.trend if latest else "stable",
            summary=(
                f"Recent conversations mainly relate to {latest.topic.lower()}. "
                f"{latest.positive_progress or ''} {latest.attention_area or ''}"
                if latest else "Start a conversation to receive a supportive wellbeing summary."
            ),
            suggestions=list(dict.fromkeys(suggestions))[:5],
            conversations=[analysis_payload(analysis) for analysis in analyses],
        )
    finally:
        db.close()


@app.get("/admin/users", response_model=list[AdminUserResponse])
def admin_users(user: User = Depends(staff_user)):
    seed_demo_users()
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.role == "user").order_by(User.created_at.desc()).all()
        result = []
        for account in users:
            analyses = (
                db.query(AIAnalysis)
                .filter(AIAnalysis.user_id == account.id, AIAnalysis.situation_summary.is_not(None))
                .order_by(AIAnalysis.created_at.desc())
                .all()
            )
            latest = analyses[0] if analyses else None
            result.append(AdminUserResponse(
                id=account.id,
                username=account.username,
                status="Active" if latest else "New",
                conversations=len(analyses),
                wellbeing_status=latest.wellbeing_level if latest else "Not enough data",
                trend=latest.trend if latest else "stable",
                last_active=latest.created_at.isoformat() if latest else None,
            ))
        return result
    finally:
        db.close()


@app.get("/admin/users/{user_id}/dashboard")
def admin_user_dashboard(user_id: int, user: User = Depends(staff_user)):
    db = SessionLocal()
    try:
        analyses = (
            db.query(AIAnalysis)
            .filter(AIAnalysis.user_id == user_id, AIAnalysis.situation_summary.is_not(None))
            .order_by(AIAnalysis.created_at.asc())
            .all()
        )
        return {
            "conversations": [analysis_payload(analysis) for analysis in analyses],
            "summary": (
                f"General themes include {analyses[-1].topic.lower()}."
                if analyses else "No privacy-safe wellbeing data is available."
            ),
        }
    finally:
        db.close()