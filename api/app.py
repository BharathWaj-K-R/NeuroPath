from fastapi.responses import HTMLResponse
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv
import os
import json
from datetime import timedelta
from pathlib import Path

# Import DB, models, schemas, auth
from api.database import init_db, get_db, engine, User, LearningPath, Progress
from api.models.schemas import (
    UserRegister, UserLogin, UserResponse, TokenResponse,
    LearningPathCreate, LearningPathResponse, ProgressUpdate, ModuleToggle,
    QuizRequest, ChatRequest, ChatResponse,
)
from api.utils.auth import hash_password, verify_password, create_access_token, get_current_user
from api.services.grok_service import GrokService

load_dotenv()

app = FastAPI(title="NeuroPath API", version="0.1.0")

# CORS - ALWAYS allow all origins (critical for cross-origin requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Force allow all
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
    expose_headers=["*"],
)

# Mount static files BEFORE routes so /api/* routes take priority
frontend_path = Path(__file__).parent.parent / "frontend" / "public"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path), html=False), name="static")

# OPTIONS handler for CORS preflight
@app.options("/{full_path:path}")
async def preflight(full_path: str):
    """Handle CORS preflight requests"""
    return {"status": "ok"}

# Init DB on startup (optional, won't block if DB unavailable)
@app.on_event("startup")
def startup():
    try:
        init_db()
    except Exception as e:
        print(f"Warning: Could not initialize database on startup: {e}")
        print("Database will be initialized on first request or manually.")
        return
    # Lightweight migration for columns added after initial deploy (no Alembic in this project)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE progress ADD COLUMN IF NOT EXISTS completed_modules TEXT DEFAULT '[]'"))
            conn.commit()
    except Exception as e:
        print(f"Warning: could not run schema migration (non-Postgres DB or already applied): {e}")


# ---------------- helpers ----------------

def _parse_content(raw: str):
    """LearningPath.gemini_content stores a JSON blob {overview, modules}. Older rows may be plain text."""
    if not raw:
        return {"overview": "", "modules": []}
    try:
        data = json.loads(raw)
        if isinstance(data, dict) and "modules" in data:
            return {"overview": data.get("overview", ""), "modules": data.get("modules", [])}
    except Exception:
        pass
    return {"overview": "", "modules": [{"title": "Learning Path", "content": raw, "resources": [], "exercises": []}]}


def serialize_path(path: LearningPath, progress: Progress | None) -> dict:
    content = _parse_content(path.gemini_content)
    completed = []
    if progress and progress.completed_modules:
        try:
            completed = json.loads(progress.completed_modules)
        except Exception:
            completed = []
    return {
        "id": path.id,
        "user_id": path.user_id,
        "topic": path.topic,
        "difficulty_level": path.difficulty_level,
        "goals": path.goals,
        "overview": content["overview"],
        "modules": content["modules"],
        "completed_modules": completed,
        "progress": progress.completion_percentage if progress else 0.0,
        "status": progress.status if progress else "in_progress",
        "created_at": path.created_at,
    }


def _get_progress(db: Session, user_id: int, path_id: int) -> Progress | None:
    return db.query(Progress).filter(
        Progress.user_id == user_id, Progress.learning_path_id == path_id
    ).first()


def _get_or_create_progress(db: Session, user_id: int, path_id: int) -> Progress:
    p = _get_progress(db, user_id, path_id)
    if not p:
        p = Progress(user_id=user_id, learning_path_id=path_id, completion_percentage=0.0, completed_modules="[]", status="in_progress")
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


# Routes
@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve frontend index.html"""
    try:
        with open(Path(__file__).parent.parent / "frontend" / "public" / "index.html", "r") as f:
            return f.read()
    except:
        return "<h1>NeuroPath API</h1><p>Frontend not found. API available at /api/*</p>"

@app.get("/api")
async def api_root():
    return {"message": "NeuroPath API v0.1.0", "status": "running"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

# Auth routes
@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = hash_password(user.password)
    new_user = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(new_user)
    }

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": db_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(db_user)
    }

# Learning Path routes
@app.get("/api/learning-paths", response_model=list[LearningPathResponse])
async def get_learning_paths(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paths = db.query(LearningPath).filter(LearningPath.user_id == current_user.id).order_by(LearningPath.created_at.desc()).all()
    result = []
    for p in paths:
        progress = _get_progress(db, current_user.id, p.id)
        result.append(serialize_path(p, progress))
    return result

@app.get("/api/learning-paths/{path_id}", response_model=LearningPathResponse)
async def get_learning_path(
    path_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    path = db.query(LearningPath).filter(
        LearningPath.id == path_id,
        LearningPath.user_id == current_user.id
    ).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")
    progress = _get_progress(db, current_user.id, path.id)
    return serialize_path(path, progress)

@app.delete("/api/learning-paths/{path_id}")
async def delete_learning_path(
    path_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    path = db.query(LearningPath).filter(
        LearningPath.id == path_id,
        LearningPath.user_id == current_user.id
    ).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")
    db.delete(path)
    db.commit()
    return {"deleted": True, "id": path_id}

@app.patch("/api/learning-paths/{path_id}", response_model=LearningPathResponse)
async def update_learning_path_progress(
    path_id: int,
    update: ProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    path = db.query(LearningPath).filter(
        LearningPath.id == path_id,
        LearningPath.user_id == current_user.id
    ).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")

    progress = _get_or_create_progress(db, current_user.id, path.id)
    content = _parse_content(path.gemini_content)
    total = len(content["modules"])

    if update.progress is not None:
        progress.completion_percentage = max(0.0, min(100.0, update.progress))
        if progress.completion_percentage >= 100 and total:
            progress.completed_modules = json.dumps(list(range(total)))
        elif progress.completion_percentage <= 0:
            progress.completed_modules = json.dumps([])
    if update.status is not None:
        progress.status = update.status
    elif progress.completion_percentage >= 100:
        progress.status = "completed"

    db.commit()
    db.refresh(progress)
    return serialize_path(path, progress)

@app.patch("/api/learning-paths/{path_id}/modules/{module_index}", response_model=LearningPathResponse)
async def toggle_module(
    path_id: int,
    module_index: int,
    body: ModuleToggle,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    path = db.query(LearningPath).filter(
        LearningPath.id == path_id,
        LearningPath.user_id == current_user.id
    ).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")

    content = _parse_content(path.gemini_content)
    total = len(content["modules"])
    if module_index < 0 or module_index >= total:
        raise HTTPException(status_code=400, detail="Invalid module index")

    progress = _get_or_create_progress(db, current_user.id, path.id)
    try:
        completed = set(json.loads(progress.completed_modules or "[]"))
    except Exception:
        completed = set()

    if body.completed:
        completed.add(module_index)
    else:
        completed.discard(module_index)

    progress.completed_modules = json.dumps(sorted(completed))
    progress.completion_percentage = round(len(completed) / total * 100, 1) if total else 0.0
    progress.status = "completed" if progress.completion_percentage >= 100 else "in_progress"

    db.commit()
    db.refresh(progress)
    return serialize_path(path, progress)

# AI routes
@app.post("/api/ai/generate-path", response_model=LearningPathResponse)
async def generate_learning_path(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic = request.get("topic")
    difficulty = request.get("difficulty_level", "intermediate")
    skill_level = request.get("skill_level")
    goals = request.get("goals")

    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")

    grok = GrokService()
    structured = await grok.generate_learning_path(
        topic=topic,
        difficulty=difficulty,
        goals=goals,
        skill_level=skill_level,
    )

    path = LearningPath(
        user_id=current_user.id,
        topic=topic,
        difficulty_level=skill_level or difficulty,
        goals=goals,
        gemini_content=json.dumps(structured),
    )
    db.add(path)
    db.commit()
    db.refresh(path)

    progress = _get_or_create_progress(db, current_user.id, path.id)
    return serialize_path(path, progress)

@app.post("/api/ai/quiz")
async def generate_quiz(
    body: QuizRequest,
    current_user: User = Depends(get_current_user),
):
    grok = GrokService()
    quiz = await grok.generate_skill_quiz(topic=body.topic, num_questions=body.num_questions)
    return {"topic": body.topic, "questions": quiz.get("questions", [])}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    grok = GrokService()
    history = [{"role": m.role, "content": m.content} for m in body.history]
    reply = await grok.chat(body.message, history)
    return {"reply": reply}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
# Force rebuild 1785731094
