from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func
from datetime import datetime, timedelta
from typing import List, Optional

from models.signal import Signal
from models.usersignal import UserSignal
from models.user import User
from schemas.signal import SignalCreate, SignalUpdate, TakeSignalSchema
from core.signal_engine import SignalEngine
from core.wallet_manager import WalletManager
from services.notification_service import NotificationService


class SignalService:
    
    def __init__(self, db: Session):
        self.db = db
        self.signal_engine = SignalEngine(db)
        self.wallet_manager = WalletManager(db)
        self.notification_service = NotificationService(db)
    
    # ============ Admin Signal Management ============
    
    def create_signal(self, admin_id: int, signal_data: SignalCreate) -> Signal:
        """Create new signal"""
        signal = Signal(
            **signal_data.model_dump(),
            created_by=admin_id
        )
        self.db.add(signal)
        self.db.commit()
        self.db.refresh(signal)
        return signal
    
    def update_signal(self, signal_id: int, update_data: SignalUpdate) -> Optional[Signal]:
        """Update signal and process results"""
        
        signal = self.db.query(Signal).filter(Signal.id == signal_id).first()
        if not signal:
            return None
        
        # Check if result is being updated
        old_result = signal.result
        new_result = update_data.result
        
        # Update fields
        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(signal, key, value)
        
        # If result changed to win/loss, process user signals
        if new_result and new_result != "pending" and new_result != old_result:
            self._process_signal_result(signal_id, new_result)
        
        self.db.commit()
        self.db.refresh(signal)
        return signal
    
    def _process_signal_result(self, signal_id: int, result: str):
        """Process all pending user signals for this signal"""
        
        user_signals = self.db.query(UserSignal).filter(
            UserSignal.signal_id == signal_id,
            UserSignal.result == "pending"
        ).all()
        
        signal = self.db.query(Signal).filter(Signal.id == signal_id).first()
        
        for us in user_signals:
            us.result = result
            us.closed_at = datetime.now()
            
            if result == "win":
                # 80% profit on investment
                profit = us.invested_amount * 0.8
                us.profit_loss = profit
                
                # Add profit to wallet
                self.wallet_manager.add_profit(us.user_id, signal_id, profit)
                
                # Send win notification
                if signal:
                    self.notification_service.create_notification(
                        user_id=us.user_id,
                        title="🎉 Signal Won!",
                        message=f"Good news! {signal.symbol} signal just WON! You earned ${profit:.2f} profit. Your wallet has been credited.",
                        type="signal"
                    )
                
            elif result == "loss":
                us.profit_loss = -us.invested_amount
                
                # Grant free signal
                self.signal_engine.process_signal_result(
                    us.user_id, signal_id, "loss", -us.invested_amount
                )
                
                # Send loss notification
                if signal:
                    self.notification_service.create_notification(
                        user_id=us.user_id,
                        title="😢 Signal Lost",
                        message=f"Unfortunately, {signal.symbol} signal LOST. You lost ${us.invested_amount:.2f}. But don't worry! A FREE signal has been granted for your next trade.",
                        type="signal"
                    )
                
                # Send free signal granted notification
                self.notification_service.create_notification(
                    user_id=us.user_id,
                    title="✨ Free Signal Granted!",
                    message="You have received a FREE signal for your next trade! Use it wisely.",
                    type="system"
                )
        
        # Update signal statistics
        if signal:
            signal.total_wins = self.db.query(UserSignal).filter(
                UserSignal.signal_id == signal_id,
                UserSignal.result == "win"
            ).count()
            
            signal.total_losses = self.db.query(UserSignal).filter(
                UserSignal.signal_id == signal_id,
                UserSignal.result == "loss"
            ).count()
        
        self.db.commit()
    
    def delete_signal(self, signal_id: int) -> bool:
        """Delete signal (admin only)"""
        signal = self.db.query(Signal).filter(Signal.id == signal_id).first()
        if not signal:
            return False
        
        self.db.delete(signal)
        self.db.commit()
        return True
    
    # ============ User Signal Operations ============
    
    def get_active_signals(self, limit: int = 50) -> List[Signal]:
        """Get active signals for users"""
        return self.db.query(Signal).filter(
            Signal.status == "active"
        ).order_by(desc(Signal.created_at)).limit(limit).all()
    
    def get_signal_detail(self, signal_id: int) -> Optional[Signal]:
        """Get single signal details"""
        return self.db.query(Signal).filter(Signal.id == signal_id).first()
    
    def get_signals_with_filters(
        self, 
        symbol: Optional[str] = None,
        signal_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Signal]:
        """Get signals with filters"""
        
        query = self.db.query(Signal)
        
        if symbol:
            query = query.filter(Signal.symbol == symbol)
        if signal_type:
            query = query.filter(Signal.signal_type == signal_type)
        if status:
            query = query.filter(Signal.status == status)
        else:
            query = query.filter(Signal.status == "active")
        
        return query.order_by(desc(Signal.created_at)).limit(limit).all()
    
    def take_signal(self, user_id: int, data: TakeSignalSchema) -> dict:
        """User takes a signal"""
        
        # Check user
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}
        
        # Check signal
        signal = self.db.query(Signal).filter(
            Signal.id == data.signal_id,
            Signal.status == "active"
        ).first()
        
        if not signal:
            return {"error": "Signal not found or not active"}
        
        # Check if already taken
        existing = self.db.query(UserSignal).filter(
            UserSignal.user_id == user_id,
            UserSignal.signal_id == data.signal_id
        ).first()
        
        if existing:
            return {"error": "You already took this signal"}
        
        # Check free signal
        is_free = self.signal_engine.check_free_signal_eligibility(user_id)
        
        if is_free:
            self.signal_engine.use_free_signal(user_id)
            amount_deducted = 0
        else:
            success = self.wallet_manager.deduct_for_signal(
                user_id, data.signal_id, data.invested_amount
            )
            if not success:
                return {"error": "Insufficient balance"}
            amount_deducted = data.invested_amount
        
        # Create user signal record
        user_signal = UserSignal(
            user_id=user_id,
            signal_id=data.signal_id,
            taken_price=signal.entry_price,
            invested_amount=data.invested_amount,
            deducted_amount=amount_deducted
        )
        self.db.add(user_signal)
        
        # Update signal stats
        signal.total_taken += 1
        
        self.db.commit()
        
        # Refresh user balance
        self.db.refresh(user)
        
        # Send notification for taking signal
        self.notification_service.create_notification(
            user_id=user_id,
            title="📊 Signal Taken",
            message=f"You have taken {signal.symbol} signal. Investment: ${data.invested_amount:.2f}. Good luck! 🍀",
            type="signal"
        )
        
        return {
            "success": True,
            "message": "Signal taken successfully",
            "user_signal_id": user_signal.id,
            "free_signal_used": is_free,
            "amount_deducted": amount_deducted,
            "new_balance": user.wallet_balance
        }
    
    def get_user_signals(self, user_id: int, result: Optional[str] = None) -> List[UserSignal]:
        """Get user's signal history"""
        
        query = self.db.query(UserSignal).filter(UserSignal.user_id == user_id)
        
        if result:
            query = query.filter(UserSignal.result == result)
        
        return query.order_by(desc(UserSignal.taken_at)).all()
    
    def get_signal_stats(self) -> dict:
        """Get signal statistics for dashboard"""
        
        # Active signals count
        active_count = self.db.query(Signal).filter(Signal.status == "active").count()
        
        # Success rate
        total_closed = self.db.query(UserSignal).filter(
            UserSignal.result != "pending"
        ).count()
        
        total_wins = self.db.query(UserSignal).filter(UserSignal.result == "win").count()
        success_rate = (total_wins / total_closed * 100) if total_closed > 0 else 0
        
        # Time-based counts
        now = datetime.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        year_ago = now - timedelta(days=365)
        
        signals_this_week = self.db.query(Signal).filter(Signal.created_at >= week_ago).count()
        signals_this_month = self.db.query(Signal).filter(Signal.created_at >= month_ago).count()
        signals_this_year = self.db.query(Signal).filter(Signal.created_at >= year_ago).count()
        
        # Signals by symbol
        symbols = ["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD", "USDJPY"]
        signals_by_symbol = {}
        for symbol in symbols:
            count = self.db.query(Signal).filter(Signal.symbol == symbol).count()
            if count > 0:
                signals_by_symbol[symbol] = count
        
        # Signals by type
        signals_by_type = {
            "free": self.db.query(Signal).filter(Signal.signal_type == "free").count(),
            "premium": self.db.query(Signal).filter(Signal.signal_type == "premium").count()
        }
        
        return {
            "total_active": active_count,
            "success_rate": round(success_rate, 1),
            "total_signals_this_week": signals_this_week,
            "total_signals_this_month": signals_this_month,
            "total_signals_this_year": signals_this_year,
            "signals_by_symbol": signals_by_symbol,
            "signals_by_type": signals_by_type
        }