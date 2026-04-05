from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from config import settings

# ========== IMPORT ALL MODELS HERE ==========
from models.user import User
from models.transaction import Transaction
from models.signal import Signal
from models.usersignal import UserSignal

# ========== CREATE TABLES ==========
Base.metadata.create_all(bind=engine)

# ========== IMPORT ROUTES ==========
from routes import auth_routes
from routes import dashboard_routes
from routes import user_routes
from routes import wallet_routes
from routes import admin_routes
from routes import signal_routes

app.include_router(auth_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(user_routes.router)
app.include_router(wallet_routes.router)
app.include_router(admin_routes.router)
app.include_router(signal_routes.router)
app = FastAPI(
    title="Asian FX Trading API - Person B",
    description="Signal Management and Admin Panel APIs",
    version="2.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(signals_router)
app.include_router(admin_router)

@app.get("/")
def root():
    return {
        "message": "Asian FX API - Person B (Signals & Admin)",
        "version": "2.0.0",
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "person-b-backend"}