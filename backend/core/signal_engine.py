from sqlalchemy.orm import Session
from models.user import User
from models.usersignal import UserSignal
from models.transaction import Transaction

class SignalEngine:
    """Handles free signal logic and wallet operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def process_signal_result(self, user_id: int, signal_id: int, result: str, profit_loss: float):
        """Process signal result and update user wallet"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        if result == "win" and profit_loss > 0:
            # Add profit to wallet
            user.wallet_balance += profit_loss
            
            # Record profit transaction
            transaction = Transaction(
                user_id=user_id,
                amount=profit_loss,
                type="profit",
                description=f"Profit from signal #{signal_id}"
            )
            self.db.add(transaction)
            
            return {"profit_added": profit_loss, "new_balance": user.wallet_balance}
        
        elif result == "loss":
            # Grant free signal for next time
            user.free_signal_available = True
            
            # Record loss transaction
            transaction = Transaction(
                user_id=user_id,
                amount=abs(profit_loss),
                type="loss",
                description=f"Loss from signal #{signal_id}"
            )
            self.db.add(transaction)
            
            return {
                "free_signal_granted": True,
                "loss_amount": abs(profit_loss),
                "message": "Free signal granted for next trade"
            }
        
        self.db.commit()
        return {"message": "Signal processed"}

    def check_free_signal_eligibility(self, user_id: int) -> bool:
        """Check if user can take a free signal"""
        user = self.db.query(User).filter(User.id == user_id).first()
        return user.free_signal_available if user else False
    
    def use_free_signal(self, user_id: int) -> bool:
        """Use up the free signal"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.free_signal_available:
            return False
        
        user.free_signal_available = False
        self.db.commit()
        return True