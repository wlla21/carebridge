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
    if "user_id" not in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses ADD COLUMN user_id INTEGER NULL"))
    if "prompt" in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses MODIFY COLUMN prompt TEXT NULL"))
    if "answer" in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses MODIFY COLUMN answer TEXT NULL"))
    if "situation_summary" not in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses ADD COLUMN situation_summary TEXT NULL"))
    if "urgency" not in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses ADD COLUMN urgency VARCHAR(20) NULL"))
    if "support_type" not in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses ADD COLUMN support_type VARCHAR(100) NULL"))
    if "recommended_next_steps" not in analysis_columns:
        connection.execute(text("ALTER TABLE ai_analyses ADD COLUMN recommended_next_steps TEXT NULL"))

groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key) if groq_api_key else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_URLS",
            "http://localhost:5173,http://127.0.0.1:5173",
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
                    "user_answer, situation_summary, urgency, support_type, "
                    "recommended_next_steps. The situation_summary must be anonymous and "
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
        situation_summary = result["situation_summary"]
        urgency = result["urgency"].lower()
        support_type = result["support_type"]
        recommended_next_steps = result["recommended_next_steps"]
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=502, detail="The AI returned an invalid analysis.")
    if urgency not in {"low", "medium", "high", "emergency"}:
        raise HTTPException(status_code=502, detail="The AI returned an invalid urgency.")

    analysis = AIAnalysis(
        user_id=user.id,
        situation_summary=situation_summary,
        urgency=urgency,
        support_type=support_type,
        recommended_next_steps=recommended_next_steps,
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