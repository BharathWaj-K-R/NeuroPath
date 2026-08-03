from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database - Use internal Render link for Render-to-Render
    DATABASE_URL: str = "postgresql://neuropath_s6s3_user:WyTSkQDcNQhl9HORr9Y9Pa5JeoyGsYK1@dpg-d9nd6061egvs73frc7qg-a/neuropath_s6s3"
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # AI - Grok (X.AI)
    GROK_API_KEY: str = ""
    
    # Environment
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
