from pydantic import BaseModel, EmailStr
from typing import Optional
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

class LearningPathResponse(BaseModel):
    id: int
    user_id: int
    topic: str
    difficulty_level: str
    goals: Optional[str]
    gemini_content: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProgressUpdate(BaseModel):
    completion_percentage: float
    status: str

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

class FeedbackRequest(BaseModel):
    topic: str
    user_response: str
