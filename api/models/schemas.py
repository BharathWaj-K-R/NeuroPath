from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class LearningPathCreate(BaseModel):
    topic: str
    difficulty_level: str
    goals: Optional[str] = None
    skill_level: Optional[str] = None

class ModuleModel(BaseModel):
    title: str
    content: str
    resources: List[str] = []
    exercises: List[str] = []

class LearningPathResponse(BaseModel):
    id: int
    user_id: int
    topic: str
    difficulty_level: str
    goals: Optional[str] = None
    overview: str = ""
    modules: List[ModuleModel] = []
    completed_modules: List[int] = []
    progress: float = 0.0
    status: str = "in_progress"
    created_at: datetime

class ProgressUpdate(BaseModel):
    progress: Optional[float] = None
    status: Optional[str] = None

class ModuleToggle(BaseModel):
    completed: bool

class ProgressResponse(BaseModel):
    id: int
    learning_path_id: int
    completion_percentage: float
    status: str
    last_accessed: datetime
    
    class Config:
        from_attributes = True

class QuizRequest(BaseModel):
    topic: str
    num_questions: int = 5

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    level: str = "intermediate"

class QuizResponse(BaseModel):
    topic: str
    questions: List[QuizQuestion]

class FeedbackRequest(BaseModel):
    topic: str
    user_response: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
