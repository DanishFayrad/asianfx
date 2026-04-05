# config.py - Without pydantic-settings
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/asian_fx_db")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your_super_secret_key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    
    # Admin
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "admin_secret_key_123")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = Settings()