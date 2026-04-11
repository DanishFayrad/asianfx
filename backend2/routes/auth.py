from fastapi import APIRouter, Depends, HTTPException,BackgroundTasks
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.user import User
from utils.hashing import hash_password, verify_password
from utils.jwt import create_token
from services.email_service import generate_verification_token, send_verification_email

router = APIRouter(tags=["Authentication"])

# ========== Schemas ==========
class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str

class LoginSchema(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: str
    wallet_balance: float
    is_admin: bool

# ========== APIs ==========

@router.post("/register")
async def register(
    data: RegisterSchema, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    try:
        # Create new user (is_verified = False initially)
        new_user = User(
            name=data.name,
            email=data.email,
            password=hash_password(data.password),
            wallet_balance=0.0,
            free_signal_available=False,
            is_admin=False,
            is_verified=False
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # ✅ Generate token and send verification email
        token = generate_verification_token(data.email)
        background_tasks.add_task(
            send_verification_email, 
            data.email, 
            data.name, 
            token
        )
        
        return {
            "message": "User created successfully! Please check your email for verification.",
            "user_id": new_user.id,
            "verification_sent": True
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
@router.post("/login", response_model=LoginResponse)
def login(data: LoginSchema, db: Session = Depends(get_db)):
    """Login user"""
    
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_token({"sub": str(user.id), "email": user.email})
    
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email,
        wallet_balance=user.wallet_balance,
        is_admin=user.is_admin
    )

from services.email_service import verify_token, generate_reset_password_token, verify_reset_password_token, send_reset_password_email

class VerifyEmailSchema(BaseModel):
    token: str

@router.get("/verify-email", response_class=HTMLResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    
    email = verify_token(token)
    
    if not email:
        return HTMLResponse(content="<h1>Invalid or Expired Token</h1>", status_code=400)
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return HTMLResponse(content="<h1>User not found</h1>", status_code=404)
    
    if user.is_verified:
        return HTMLResponse(content="<h1>Email already verified</h1><p>You can now close this tab and log in.</p>")
    
    user.is_verified = True
    db.commit()
    
    return HTMLResponse(content="<h1>Email verified successfully</h1><p>You can now close this tab and log in.</p>")

class ForgotPasswordSchema(BaseModel):
    email: str

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordSchema, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Request a password reset email"""
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user:
        # Return generic message to prevent email enumeration
        return {"message": "If that email exists in our system, a reset link has been sent.", "success": True}
        
    token = generate_reset_password_token(user.email)
    
    background_tasks.add_task(
        send_reset_password_email,
        user.email,
        user.name,
        token
    )
    
    return {"message": "If that email exists in our system, a reset link has been sent.", "success": True}

@router.post("/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    """Reset password securely using a token"""
    email = verify_reset_password_token(data.token)
    
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password = hash_password(data.new_password)
    db.commit()
    
    return {"message": "Password has been reset successfully", "success": True}