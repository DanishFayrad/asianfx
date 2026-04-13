from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from models.notification import Notification
from schemas.notification import NotificationCreate, NotificationUpdate

class NotificationService:
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_notification(self, user_id: int, title: str, message: str, type: str = "system", extra_data: str = None) -> Notification:
        """Create a new notification for a user"""
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            extra_data=extra_data
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification
    
    def get_user_notifications(self, user_id: int, limit: int = 50, offset: int = 0) -> List[Notification]:
        """Get all notifications for a user"""
        return self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()
    
    def get_unread_count(self, user_id: int) -> int:
        """Get unread notifications count"""
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()
    
    def mark_as_read(self, notification_id: int, user_id: int) -> Optional[Notification]:
        """Mark a single notification as read"""
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notification:
            notification.is_read = True
            self.db.commit()
            self.db.refresh(notification)
        
        return notification
    
    def mark_all_as_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        result = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True})
        
        self.db.commit()
        return result
    
    def delete_notification(self, notification_id: int, user_id: int) -> bool:
        """Delete a notification"""
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notification:
            self.db.delete(notification)
            self.db.commit()
            return True
        return False
    
    def delete_all_notifications(self, user_id: int) -> int:
        """Delete all notifications for a user"""
        result = self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).delete()
        
        self.db.commit()
        return result
    
    # ========== Auto-notification methods ==========
    
    def send_signal_taken_notification(self, user_id: int, signal_id: int, signal_symbol: str, amount: float):
        """Send notification when user takes a signal"""
        title = "Signal Taken"
        message = f"You have taken {signal_symbol} signal with investment of ${amount}"
        self.create_notification(user_id, title, message, "signal")
    
    def send_signal_result_notification(self, user_id: int, signal_id: int, signal_symbol: str, result: str, profit_loss: float):
        """Send notification when signal result is declared"""
        if result == "win":
            title = "🎉 Signal Won!"
            message = f"{signal_symbol} signal won! You earned ${profit_loss} profit."
        else:
            title = "😢 Signal Lost"
            message = f"{signal_symbol} signal lost. Free signal granted for next trade."
        
        self.create_notification(user_id, title, message, "signal")
    
    def send_deposit_notification(self, user_id: int, amount: float, new_balance: float):
        """Send notification when user deposits money"""
        title = "Deposit Successful"
        message = f"${amount} has been added to your wallet. New balance: ${new_balance}"
        self.create_notification(user_id, title, message, "wallet")
    
    def send_withdrawal_notification(self, user_id: int, amount: float, new_balance: float):
        """Send notification when user withdraws money"""
        title = "Withdrawal Successful"
        message = f"${amount} has been withdrawn. New balance: ${new_balance}"
        self.create_notification(user_id, title, message, "wallet")
    
    def send_free_signal_granted_notification(self, user_id: int):
        """Send notification when user gets a free signal"""
        title = "Free Signal Granted"
        message = "You have received a free signal for your next trade!"
        self.create_notification(user_id, title, message, "system")