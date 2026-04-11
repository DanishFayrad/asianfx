from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from config import settings
from pydantic import BaseModel
from services.email_service import send_consultation_email

# ========== IMPORT ALL MODELS ==========
from models.user import User
from models.consultation import Consultation
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

class ConsultationSchema(BaseModel):
    full_name: str
    email: str
    phone: str
    message: str

@app.post("/consultation/")
def consultation(data: ConsultationSchema, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        new_consultation = Consultation(
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            message=data.message
        )
        db.add(new_consultation)
        db.commit()
        
        # Send email notification to admin
        background_tasks.add_task(
            send_consultation_email,
            data.full_name,
            data.email,
            data.phone,
            data.message
        )
        return {"message": "Consultation received successfully", "success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)