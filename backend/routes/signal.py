from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from schemas.signal import (
    SignalResponse, TakeSignalSchema, UserSignalResponse, 
    DashboardSignalsResponse, SignalStatsResponse
)
from services.signal_service import SignalService

router = APIRouter(prefix="/signals", tags=["Signals"])

def get_signal_service(db: Session = Depends(get_db)):
    return SignalService(db)

# ============ User Routes ============

@router.get("/dashboard", response_model=DashboardSignalsResponse)
def get_signals_dashboard(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    limit: int = Query(20, ge=1, le=100),
    service: SignalService = Depends(get_signal_service)
):
    """Get all signals for the dashboard"""
    
    # Get active signals
    if symbol:
        active_signals = service.get_signals_with_filters(
            symbol=symbol, status="active", limit=limit
        )
    else:
        active_signals = service.get_active_signals(limit)
    
    # Get recent signals (last 10)
    recent_signals = service.get_signals_with_filters(limit=10)
    
    # Get stats
    stats = service.get_signal_stats()
    
    return DashboardSignalsResponse(
        active_signals=active_signals,
        recent_signals=recent_signals,
        stats=SignalStatsResponse(**stats)
    )

@router.get("", response_model=List[SignalResponse])
def get_signals(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    signal_type: Optional[str] = Query(None, regex="^(free|premium)$"),
    status: str = Query("active", regex="^(active|hit_target|stop_loss_hit|closed)$"),
    limit: int = Query(50, ge=1, le=100),
    service: SignalService = Depends(get_signal_service)
):
    """Get signals with filters"""
    return service.get_signals_with_filters(symbol, signal_type, status, limit)

@router.get("/{signal_id}", response_model=SignalResponse)
def get_signal_detail(
    signal_id: int,
    service: SignalService = Depends(get_signal_service)
):
    """Get single signal details"""
    signal = service.get_signal_detail(signal_id)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    return signal

@router.post("/take")
def take_signal(
    data: TakeSignalSchema,
    user_id: int = Query(..., description="User ID"),
    service: SignalService = Depends(get_signal_service)
):
    """User takes a signal"""
    result = service.take_signal(user_id, data)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@router.get("/user/{user_id}/history", response_model=List[UserSignalResponse])
def get_user_signals(
    user_id: int,
    result: Optional[str] = Query(None, regex="^(win|loss|pending)$"),
    service: SignalService = Depends(get_signal_service)
):
    """Get user's signal history"""
    return service.get_user_signals(user_id, result)

@router.get("/stats", response_model=SignalStatsResponse)
def get_signal_stats(
    service: SignalService = Depends(get_signal_service)
):
    """Get signal statistics"""
    stats = service.get_signal_stats()
    return SignalStatsResponse(**stats)