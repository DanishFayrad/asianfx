from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from config import settings

# ========== IMPORT ALL MODELS ==========
from models.user import User
from models.transaction import Transaction
from models.signal import Signal
from models.usersignal import UserSignal

# ========== CREATE TABLES ==========
Base.metadata.create_all(bind=engine)

# ========== IMPORT ROUTES ==========
from routes.auth import router as auth_router
from routes.wallet import router as wallet_router
from routes.dashboard import router as dashboard_router
from routes.signal import router as signals_router
from routes.admin import router as admin_router
from routes.notification import router as notification_router


app = FastAPI(
    title="Asian FX Trading API - Complete",
    description="User + Signal + Admin System",
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

# Include all routers
app.include_router(auth_router)
app.include_router(wallet_router)
app.include_router(dashboard_router)
app.include_router(signals_router)
app.include_router(admin_router)
app.include_router(notification_router)

@app.get("/")
def root():
    return {
        "message": "Asian FX API - Complete System",
        "version": "2.0.0",
        "endpoints": {
            "auth": "/register, /login",
            "wallet": "/deposit/{id}, /balance/{id}",
            "dashboard": "/dashboard/{id}",
            "signals": "/signals, /signals/take",
            "admin": "/admin/signals, /admin/users"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "complete-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)