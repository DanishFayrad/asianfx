from sqlalchemy.orm import Session
from models.user import User
from models.transaction import Transaction
from models.usersignal import UserSignal

class WalletManager:
    """Handles all wallet operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def deduct_for_signal(self, user_id: int, signal_id: int, amount: float) -> bool:
        """Deduct amount from user's wallet when taking a signal"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or user.wallet_balance < amount:
            return False
        
        # Deduct from wallet
        user.wallet_balance -= amount
        
        # Record transaction
        transaction = Transaction(
            user_id=user_id,
            amount=amount,
            type="signal_fee",
            description=f"Fee for signal #{signal_id}"
        )
        self.db.add(transaction)
        
        # Update user signal record
        user_signal = self.db.query(UserSignal).filter(
            UserSignal.user_id == user_id,
            UserSignal.signal_id == signal_id
        ).first()
        
        if user_signal:
            user_signal.deducted_amount = amount
        
        self.db.commit()
        return True
    
    def add_profit(self, user_id: int, signal_id: int, amount: float) -> bool:
        """Add profit to user's wallet"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.wallet_balance += amount
        
        transaction = Transaction(
            user_id=user_id,
            amount=amount,
            type="profit",
            description=f"Profit from signal #{signal_id}"
        )
        self.db.add(transaction)
        
        self.db.commit()
        return True