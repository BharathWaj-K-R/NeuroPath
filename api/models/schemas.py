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
    difficulty_level: str  # beginner, intermediate, advanced
    goals: Optional[str] = None

class LearningPathResponse(BaseModel):
    id: int
    user_id: int
    topic: str
    difficulty_level: str
    goals: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
