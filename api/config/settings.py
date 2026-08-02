from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database - use PostgreSQL from env (Render provides it)
    DATABASE_URL: str = "postgresql://user:password@localhost/neuropath"
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # AI - Grok (X.AI)
    GROK_API_KEY: str = ""
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
