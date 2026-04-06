from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from database import Base

class Signal(Base):
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False)
    type = Column(String(10), nullable=False)
    entry_price = Column(Float, nullable=False)
    target_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    status = Column(String(20), default="active")
    result = Column(String(20), default="pending")
    signal_type = Column(String(20), default="free")
    created_by = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    total_taken = Column(Integer, default=0)
    total_wins = Column(Integer, default=0)
    total_losses = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    # routes/signal.py

from fastapi import APIRouter, Depends
from utils.email import send_signal_notification
from sqlalchemy.orm import Session
from database import get_db
from models.signal import Signal
from utils.email import send_signal_notification

router = APIRouter()

@router.post("/signals")
async def create_signal(signal_data: dict, user_email: str, db: Session = Depends(get_db)):
    # 1. DB me signal save karo
    new_signal = Signal(**signal_data)
    db.add(new_signal)
    db.commit()
    db.refresh(new_signal)
    
    # 2. Email notification bhejo
    await send_signal_notification(
        email=user_email,
        signal_info=f"Signal: {signal_data.get('title', 'No Title')}"
    )
    
    return {"message": "Signal created and notification sent", "signal": new_signal}