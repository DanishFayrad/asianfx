# config.py - Without pydantic-settings
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:giligili0698@localhost:5432/asian_fx")
    
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
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:giligili0698@localhost:5432/asian_fx")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your_super_secret_key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    
    # Admin
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "admin_secret_key_123")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Email (FastAPI Mail)
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "your_email@example.com")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "your_email_password")
    MAIL_FROM: str = os.getenv("MAIL_FROM", "your_email@example.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", 587))
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.example.com")
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False

settings = Settings()