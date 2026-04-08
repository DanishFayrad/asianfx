from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from schemas.signal import SignalCreate, SignalUpdate, SignalResponse, SignalStatsResponse
from schemas.admin import AdminUserStats, SystemHealthResponse, UserListResponse
from services.signal_service import SignalService
from config import settings

router = APIRouter(prefix="/admin", tags=["Admin"])

def verify_admin(admin_key: str = Header(..., alias="X-Admin-Key")):
    """Verify admin access"""
    if admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return True

def get_signal_service(db: Session = Depends(get_db)):
    return SignalService(db)

# ============ Signal Management ============

@router.post("/signals", response_model=SignalResponse)
def create_signal(
    signal_data: SignalCreate,
    admin_id: int = Query(..., description="Admin user ID"),
    admin_verified: bool = Depends(verify_admin),
    service: SignalService = Depends(get_signal_service)
):
    """Create new signal"""
    return service.create_signal(admin_id, signal_data)

@router.put("/signals/{signal_id}", response_model=SignalResponse)
def update_signal(
    signal_id: int,
    update_data: SignalUpdate,
    admin_verified: bool = Depends(verify_admin),
    service: SignalService = Depends(get_signal_service)
):
    """Update signal"""
    signal = service.update_signal(signal_id, update_data)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    return signal

@router.delete("/signals/{signal_id}")
def delete_signal(
    signal_id: int,
    admin_verified: bool = Depends(verify_admin),
    service: SignalService = Depends(get_signal_service)
):
    """Delete signal"""
    success = service.delete_signal(signal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Signal not found")
    return {"message": "Signal deleted successfully"}

@router.get("/signals/stats", response_model=SignalStatsResponse)
def get_admin_signal_stats(
    admin_verified: bool = Depends(verify_admin),
    service: SignalService = Depends(get_signal_service)
):
    """Get signal statistics for admin"""
    stats = service.get_signal_stats()
    return SignalStatsResponse(**stats)

# ============ User Management ============

@router.get("/users", response_model=List[UserListResponse])
def get_all_users(
    admin_verified: bool = Depends(verify_admin),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all users with stats"""
    from models.user import User
    from models.usersignal import UserSignal
    from sqlalchemy import func
    
    users = db.query(User).offset(offset).limit(limit).all()
    
    result = []
    for user in users:
        total_signals = db.query(UserSignal).filter(UserSignal.user_id == user.id).count()
        total_profit = db.query(func.sum(UserSignal.profit_loss)).filter(
            UserSignal.user_id == user.id,
            UserSignal.result == "win"
        ).scalar() or 0
        
        result.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "wallet_balance": user.wallet_balance,
            "free_signal_available": user.free_signal_available,
            "total_signals_taken": total_signals,
            "total_profit_loss": total_profit,
            "created_at": user.created_at
        })
    
    return result

@router.get("/stats/system", response_model=SystemHealthResponse)
def get_system_stats(
    admin_verified: bool = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get system health statistics"""
    from models.signal import Signal
    
    active_signals = db.query(Signal).filter(Signal.status == "active").count()
    pending_signals = db.query(Signal).filter(Signal.result == "pending").count()
    
    last_signal = db.query(Signal).order_by(Signal.created_at.desc()).first()
    
    return SystemHealthResponse(
        status="healthy",
        database_connected=True,
        active_signals_count=active_signals,
        pending_signals_count=pending_signals,
        last_signal_created=last_signal.created_at if last_signal else None
    )

@router.get("/stats/users", response_model=AdminUserStats)
def get_user_stats(
    admin_verified: bool = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get user statistics"""
    from models.user import User
    from models.transaction import Transaction
    from models.usersignal import UserSignal
    from sqlalchemy import func
    
    total_users = db.query(User).count()
    total_balance = db.query(func.sum(User.wallet_balance)).scalar() or 0
    
    total_deposits = db.query(func.sum(Transaction.amount)).filter(
        Transaction.type == "deposit"
    ).scalar() or 0
    
    total_signals_taken = db.query(UserSignal).count()
    total_profit = db.query(func.sum(Transaction.amount)).filter(
        Transaction.type == "profit"
    ).scalar() or 0
    
    return AdminUserStats(
        total_users=total_users,
        total_wallet_balance=total_balance,
        total_deposits=total_deposits,
        total_signals_taken=total_signals_taken,
        total_profit_paid=total_profit
    )