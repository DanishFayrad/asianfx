from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models.user import User
from models.transaction import Transaction

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/deposit/{user_id}")
def deposit(
    user_id: int, 
    amount: float,
    db: Session = Depends(get_db)
):
    # Find user
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update balance
    user.wallet_balance += amount
    
    # Record transaction
    transaction = Transaction(
        user_id=user_id,
        amount=amount,
        type="deposit"
    )
    db.add(transaction)
    db.commit()
    
    return {
        "success": True,
        "message": f"Deposited {amount} successfully",
        "user_id": user_id,
        "new_balance": user.wallet_balance
    }