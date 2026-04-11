import os
from dotenv import load_dotenv

# Load .env file explicitly from the directory config.py is in
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=env_path)
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
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")

      # ========== EMAIL CONFIGURATION ==========
    MAIL_USERNAME: str = "awaissabir107@gmail.com"  # Gmail address
    MAIL_PASSWORD: str = "zsfo nifk jzqu sdpm"     # Gmail App Password (not regular password)
    MAIL_FROM: str = "awaissabir107@gmail.com"      # Sender email
    MAIL_PORT: int = 587                          # 587 for TLS, 465 for SSL
    MAIL_SERVER: str = "smtp.gmail.com"          # For Gmail
    MAIL_STARTTLS: bool = True                    
    MAIL_SSL_TLS: bool = False                    
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True
    
    # ========== EMAIL VERIFICATION ==========
    SECRET_KEY: str = "gmail-app-key" 
    VERIFICATION_TOKEN_EXPIRY = 86400  
    
    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()