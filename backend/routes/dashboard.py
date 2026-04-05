from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List

from database import SessionLocal
from models.user import User
from models.transaction import Transaction
from models.usersignal import UserSignal  
from schemas.dashboard import DashboardResponse, DashboardStats, ProfitLossData, TransactionHistoryItem

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def calculate_trade_stats(db: Session, user_id: int):
    """Calculate trade performance stats from UserSignal table"""
    
    try:
        from models.usersignal import UserSignal
        
        total_trades = db.query(UserSignal).filter(
            UserSignal.user_id == user_id
        ).count()
        
        winning_trades = db.query(UserSignal).filter(
            UserSignal.user_id == user_id,
            UserSignal.result == "win"
        ).count()
        
        losing_trades = db.query(UserSignal).filter(
            UserSignal.user_id == user_id,
            UserSignal.result == "loss"
        ).count()
        
        # This week's trades
        week_ago = datetime.now() - timedelta(days=7)
        trades_this_week = db.query(UserSignal).filter(
            UserSignal.user_id == user_id,
            UserSignal.taken_at >= week_ago
        ).count()
        
        return {
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "trades_this_week": trades_this_week
        }
    except Exception as e:
        print(f"Trade stats error: {e}")
        return {
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "trades_this_week": 0
        }

def calculate_financial_stats(db: Session, user_id: int):
    """Calculate all financial stats"""
    
    # Total deposits
    total_deposit = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type == "deposit"
    ).scalar() or 0.0
    
    # Total withdrawals (deductions from wallet)
    total_withdrawal = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type == "deduction"
    ).scalar() or 0.0
    
    # Current balance
    user = db.query(User).filter(User.id == user_id).first()
    current_balance = user.wallet_balance if user else 0.0
    
    # Total balance = total deposits (original money)
    total_balance = total_deposit
    
    # Total profit = current_balance - total_deposit + total_withdrawal
    # (Jo profit hua hai wo extra money hai)
    total_profit = max(0, current_balance - total_deposit + total_withdrawal)
    
    # Total loss = total_withdrawal - (if loss is from trades)
    total_loss = total_withdrawal
    
    # Percentages
    if total_deposit > 0:
        profit_percentage = (total_profit / total_deposit) * 100
        loss_percentage = (total_loss / total_deposit) * 100
        roi_percentage = ((current_balance - total_deposit) / total_deposit) * 100
    else:
        profit_percentage = 0.0
        loss_percentage = 0.0
        roi_percentage = 0.0
    
    # Transaction counts
    total_transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).count()
    
    deposit_transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.type == "deposit"
    ).count()
    
    withdrawal_transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.type == "deduction"
    ).count()
    
    return {
        "total_balance": total_balance,
        "total_deposit": total_deposit,
        "total_withdrawal": total_withdrawal,
        "total_profit": total_profit,
        "total_loss": total_loss,
        "current_balance": current_balance,
        "profit_percentage": profit_percentage,
        "loss_percentage": loss_percentage,
        "roi_percentage": roi_percentage,
        "total_transactions": total_transactions,
        "deposit_transactions": deposit_transactions,
        "withdrawal_transactions": withdrawal_transactions
    }

def get_recent_transactions(db: Session, user_id: int, limit: int = 10):
    """Get recent 10 transactions"""
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).order_by(Transaction.created_at.desc()).limit(limit).all()
    
    return [
        TransactionHistoryItem(
            id=t.id,
            amount=t.amount,
            type=t.type,
            created_at=t.created_at
        )
        for t in transactions
    ]

def get_profit_loss_overview(db: Session, user_id: int):
    """Get profit/loss data for graph"""
    # Last 30 days data for graph
    profit_loss_data = []
    
    for i in range(30):
        date = (datetime.now() - timedelta(days=i)).date()
        
        # Calculate profit/loss for that day
        # Simplified: based on transactions
        day_transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            func.date(Transaction.created_at) == date
        ).all()
        
        daily_profit = sum(t.amount for t in day_transactions if t.type == "profit")
        daily_loss = sum(t.amount for t in day_transactions if t.type == "deduction")
        
        profit_loss_data.append(
            ProfitLossData(
                date=date.strftime("%Y-%m-%d"),
                profit=daily_profit,
                loss=daily_loss
            )
        )
    
    return profit_loss_data[::-1]  # Reverse to show oldest first

@router.get("/dashboard/{user_id}", response_model=DashboardResponse)
def get_user_dashboard(user_id: int, db: Session = Depends(get_db)):
    """Complete dashboard data for user"""
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all stats
    financial_stats = calculate_financial_stats(db, user_id)
    trade_stats = calculate_trade_stats(db, user_id)
    
    # Calculate win/loss rates
    win_rate = 0.0
    loss_rate = 0.0
    if trade_stats["total_trades"] > 0:
        win_rate = (trade_stats["winning_trades"] / trade_stats["total_trades"]) * 100
        loss_rate = (trade_stats["losing_trades"] / trade_stats["total_trades"]) * 100
    
    # Create stats object
    stats = DashboardStats(
        # Wallet
        current_balance=financial_stats["current_balance"],
        
        # Financial
        total_balance=financial_stats["total_balance"],
        total_deposit=financial_stats["total_deposit"],
        total_withdrawal=financial_stats["total_withdrawal"],
        total_profit=financial_stats["total_profit"],
        total_loss=financial_stats["total_loss"],
        
        # Percentages
        profit_percentage=financial_stats["profit_percentage"],
        loss_percentage=financial_stats["loss_percentage"],
        roi_percentage=financial_stats["roi_percentage"],
        
        # Transaction stats
        total_transactions=financial_stats["total_transactions"],
        deposit_transactions=financial_stats["deposit_transactions"],
        withdrawal_transactions=financial_stats["withdrawal_transactions"],
        
        # Trade stats
        total_trades=trade_stats["total_trades"],
        winning_trades=trade_stats["winning_trades"],
        losing_trades=trade_stats["losing_trades"],
        win_rate=win_rate,
        loss_rate=loss_rate,
        
        # Weekly
        trades_this_week=trade_stats["trades_this_week"],
        
        # Recent transactions
        recent_transactions=get_recent_transactions(db, user_id)
    )
    
    # Profit/Loss overview for graph
    profit_loss_overview = get_profit_loss_overview(db, user_id)
    
    return DashboardResponse(
        stats=stats,
        profit_loss_overview=profit_loss_overview
    )