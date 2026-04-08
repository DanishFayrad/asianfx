from fastapi import APIRouter, Depends, HTTPException,BackgroundTasks
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
    is_admin: bool

# ========== APIs ==========

@router.post("/register")
async def register(
    data: RegisterSchema, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user (is_verified = False initially)
    new_user = User(
        name=data.name,
        email=data.email,
        password=hash_password(data.password),
        wallet_balance=0.0,
        free_signal_available=False,
        is_admin=False,
        is_verified=False  # ✅ Initially false
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
        is_admin=user.is_admin
    )

from services.email_service import verify_token

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify user email with token"""
    
    email = verify_token(token)
    
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Find user and mark as verified
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        return {"message": "Email already verified"}
    
    user.is_verified = True
    db.commit()
    
    return {"message": "Email verified successfully! You can now login."}