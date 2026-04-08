from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    wallet_balance = Column(Float, default=0.0)
    free_signal_available = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)  
    is_verified = Column(Boolean, default=False)  
    created_at = Column(DateTime(timezone=True), server_default=func.now())