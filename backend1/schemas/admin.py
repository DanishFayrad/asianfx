from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AdminUserStats(BaseModel):
    total_users: int
    total_wallet_balance: float
    total_deposits: float
    total_signals_taken: int
    total_profit_paid: float

class SystemHealthResponse(BaseModel):
    status: str
    database_connected: bool
    active_signals_count: int
    pending_signals_count: int
    last_signal_created: Optional[datetime]

class UserListResponse(BaseModel):
    id: int
    name: str
    email: str
    wallet_balance: float
    free_signal_available: bool
    total_signals_taken: int
    total_profit_loss: float
    created_at: datetime