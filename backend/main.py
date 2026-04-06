from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base

# ========== IMPORT MODELS ==========
from models.user import User
from models.transaction import Transaction
from models.signal import Signal
from models.usersignal import UserSignal

# ========== CREATE TABLES ==========
Base.metadata.create_all(bind=engine)

# ========== IMPORT ROUTES ==========
from routes import auth
from routes import dashboard
from routes import user
from routes import wallet
from routes import admin
from routes import signal

# ========== CREATE APP ==========
app = FastAPI(
    title="Asian FX Trading API",
    description="Merged Backend (User + Admin + Signals)",
    version="1.0.0"
)

# ========== CORS ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # frontend connect ho jaye
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== INCLUDE ROUTERS ==========
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(user.router)
app.include_router(wallet.router)
app.include_router(admin.router)
app.include_router(signal.router)

# ========== ROOT ==========
@app.get("/")
def root():
    return {
        "message": "Asian FX API is running 🚀",
        "modules": [
            "Auth",
            "Dashboard",
            "User",
            "Wallet",
            "Signals",
            "Admin"
        ]
    }

# ========== HEALTH CHECK ==========
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "backend": "merged",
    }
from fastapi import FastAPI
from routes import user  # ye import karo

app = FastAPI()

# ab user router include karo
app.include_router(user.router)