from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.transaction import Transaction
from services.notification_service import NotificationService

router = APIRouter(tags=["Wallet"])

@router.post("/deposit/{user_id}")
def deposit(user_id: int, amount: float, db: Session = Depends(get_db)):
    """Deposit money to user wallet"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Update balance
    user.wallet_balance += amount
    
    # Record transaction
    transaction = Transaction(
        user_id=user_id,
        amount=amount,
        type="deposit",
        description=f"Deposit of {amount}"
    )
    db.add(transaction)
    db.commit()


    
    # ✅ SEND DEPOSIT NOTIFICATION


    notification_service = NotificationService(db)
    notification_service.create_notification(
        user_id=user_id,
        title="💰 Deposit Successful",
        message=f"${amount:.2f} has been added to your wallet. New balance: ${user.wallet_balance:.2f}",
        type="wallet"
    )
    
    return {
        "message": "Deposit successful",
        "user_id": user_id,
        "amount": amount,
        "new_balance": user.wallet_balance
    }



@router.get("/balance/{user_id}")
def get_balance(user_id: int, db: Session = Depends(get_db)):
    """Get user wallet balance"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user_id,
        "balance": user.wallet_balance
    }