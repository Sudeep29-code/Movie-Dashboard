import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cinema Seat Booking & Management System"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-development-key-change-in-production-1234567890")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for dev convenience
    
    # Database URL: defaults to sqlite for out-of-the-box zero-dependency dev, supports MySQL via DATABASE_URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./cinema.db")
    
    TEACHER_MAX_SEATS: int = 10
    AUDITORIUM_SEAT_COUNT: int = 821

    class Config:
        env_file = ".env"

settings = Settings()
