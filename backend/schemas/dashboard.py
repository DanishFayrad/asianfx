from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TransactionHistoryItem(BaseModel):
    id: int
    amount: float
    type: str  # deposit / deduction
    created_at: datetime

class DashboardStats(BaseModel):
    # Wallet Overview
    current_balance: float
    
    # Financial Performance
    total_balance: float
    total_deposit: float
    total_withdrawal: float
    total_profit: float
    total_loss: float
    
    # Percentages
    profit_percentage: float
    loss_percentage: float
    roi_percentage: float
    
    # Transaction Stats
    total_transactions: int
    deposit_transactions: int
    withdrawal_transactions: int
    
    # Trade Performance
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    loss_rate: float
    
    # Weekly Stats
    trades_this_week: int
    
    # Recent Transactions
    recent_transactions: List[TransactionHistoryItem]

class ProfitLossData(BaseModel):
    date: str
    profit: float
    loss: float

class DashboardResponse(BaseModel):
    stats: DashboardStats
    profit_loss_overview: List[ProfitLossData]