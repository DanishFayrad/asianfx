from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.user import User
from models.transaction import Transaction
from models.usersignal import UserSignal

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard/{user_id}")
def get_dashboard(user_id: int, db: Session = Depends(get_db)):
    """Get complete dashboard data for user"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Financial stats
    total_deposit = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type == "deposit"
    ).scalar() or 0
    
    total_profit = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type == "profit"
    ).scalar() or 0
    
    total_loss = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type == "loss"
    ).scalar() or 0
    
    total_withdrawal = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.type == "withdrawal"
    ).scalar() or 0
    
    # Trade stats
    total_trades = db.query(UserSignal).filter(UserSignal.user_id == user_id).count()
    winning_trades = db.query(UserSignal).filter(
        UserSignal.user_id == user_id,
        UserSignal.result == "win"
    ).count()
    losing_trades = db.query(UserSignal).filter(
        UserSignal.user_id == user_id,
        UserSignal.result == "loss"
    ).count()
    
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    
    # Recent transactions
    recent_transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).order_by(Transaction.created_at.desc()).limit(10).all()
    
    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "wallet_balance": user.wallet_balance,
            "free_signal_available": user.free_signal_available
        },
        "stats": {
            "total_deposit": total_deposit,
            "total_withdrawal": total_withdrawal,
            "total_profit": total_profit,
            "total_loss": total_loss,
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "win_rate": round(win_rate, 1)
        },
        "recent_transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "type": t.type,
                "description": t.description,
                "created_at": t.created_at
            }
            for t in recent_transactions
        ]
    }