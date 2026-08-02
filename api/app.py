from fastapi.responses import HTMLResponse
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
from datetime import timedelta
from pathlib import Path

# Import DB, models, schemas, auth
from api.database import init_db, get_db, User, LearningPath, Progress
from api.models.schemas import (
    UserRegister, UserLogin, UserResponse, TokenResponse, 
    LearningPathCreate, LearningPathResponse
)
from api.utils.auth import hash_password, verify_password, create_access_token, get_current_user
from api.services.grok_service import GrokService

load_dotenv()

app = FastAPI(title="NeuroPath API", version="0.1.0")

# CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if os.getenv("ENVIRONMENT") == "production":
    origins.append(os.getenv("FRONTEND_URL", ""))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files BEFORE routes so /api/* routes take priority
frontend_path = Path(__file__).parent.parent / "frontend" / "public"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path), html=False), name="static")

# Init DB on startup (optional, won't block if DB unavailable)
@app.on_event("startup")
def startup():
    try:
        init_db()
    except Exception as e:
        print(f"Warning: Could not initialize database on startup: {e}")
        print("Database will be initialized on first request or manually.")
        pass

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
    # Check if user exists
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_pwd = hash_password(user.password)
    new_user = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Return token
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
    paths = db.query(LearningPath).filter(LearningPath.user_id == current_user.id).all()
    return paths

@app.post("/api/learning-paths", response_model=LearningPathResponse)
async def create_learning_path(
    path: LearningPathCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_path = LearningPath(
        user_id=current_user.id,
        topic=path.topic,
        difficulty_level=path.difficulty_level,
        goals=path.goals
    )
    db.add(new_path)
    db.commit()
    db.refresh(new_path)
    return new_path

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
    return path

# AI routes
@app.post("/api/ai/generate-path")
async def generate_learning_path(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic = request.get("topic")
    difficulty = request.get("difficulty_level", "intermediate")
    
    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")
    
    # Generate content via Grok
    grok = GrokService()
    content = await grok.generate_learning_path(
        topic=topic,
        difficulty=difficulty,
        goals=request.get("goals")
    )
    
    # Save to DB
    path = LearningPath(
        user_id=current_user.id,
        topic=topic,
        difficulty_level=difficulty,
        goals=request.get("goals"),
        gemini_content=content
    )
    db.add(path)
    db.commit()
    db.refresh(path)
    
    return {
        "id": path.id,
        "topic": path.topic,
        "difficulty_level": path.difficulty_level,
        "content": content,
        "created_at": path.created_at
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
