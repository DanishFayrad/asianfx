from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from database import Base

class UserSignal(Base):
    __tablename__ = "usersignals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    signal_id = Column(Integer, ForeignKey("signals.id", ondelete="CASCADE"), nullable=False)
    taken_price = Column(Float, nullable=False)
    result = Column(String(20), default="pending")
    profit_loss = Column(Float, default=0.0)
    invested_amount = Column(Float, default=0.0)
    deducted_amount = Column(Float, default=0.0)
    taken_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)