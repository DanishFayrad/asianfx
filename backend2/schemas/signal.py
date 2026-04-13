from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# ============ Signal Schemas ============

class SignalBase(BaseModel):
    symbol: str = Field(..., description="Trading asset symbol (e.g. XAUUSD, BTC/USDT, ETH, EURUSD)")
    type: str = Field(..., pattern=r'^(Buy|Sell)$')
    price: float = Field(0.0, ge=0, description="Cost of the signal (0 for free)")
    entry_price: float = Field(..., gt=0)
    target_price: float = Field(..., gt=0)
    stop_loss: float = Field(..., gt=0)
    signal_type: str = Field("free", pattern=r'^(free|premium)$')
    description: Optional[str] = None
    expires_at: Optional[datetime] = None
    image_url: Optional[str] = None

class SignalCreate(SignalBase):
    pass

class SignalUpdate(BaseModel):
    symbol: Optional[str] = None
    type: Optional[str] = None
    price: Optional[float] = None
    entry_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    status: Optional[str] = Field(None, pattern=r'^(active|hit_target|stop_loss_hit|closed)$')
    result: Optional[str] = Field(None, pattern=r'^(win|loss|pending)$')
    signal_type: Optional[str] = None

class SignalResponse(SignalBase):
    id: int
    status: str
    result: str
    created_by: int
    created_at: datetime
    expires_at: Optional[datetime]
    updated_at: Optional[datetime]
    total_taken: int
    total_wins: int
    total_losses: int
    
    class Config:
        from_attributes = True

# ============ User Taking Signal ============

class TakeSignalSchema(BaseModel):
    signal_id: int = Field(..., gt=0)
    invested_amount: float = Field(..., gt=0, le=10000)

class UserSignalResponse(BaseModel):
    id: int
    user_id: int
    signal_id: int
    taken_price: float
    result: str
    profit_loss: float
    invested_amount: float
    deducted_amount: float
    taken_at: datetime
    closed_at: Optional[datetime]
    signal_details: Optional[SignalResponse] = None
    
    class Config:
        from_attributes = True

# ============ Stats Schemas ============

class SignalStatsResponse(BaseModel):
    total_active: int
    success_rate: float
    targets_hit: int
    total_profit: float
    total_signals_this_week: int
    total_signals_this_month: int
    total_signals_this_year: int
    signals_by_symbol: dict
    signals_by_type: dict

class DashboardSignalsResponse(BaseModel):
    active_signals: List[SignalResponse]
    recent_signals: List[SignalResponse]
    stats: SignalStatsResponse