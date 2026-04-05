from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from database import SessionLocal
from schemas.auth import RegisterSchema, LoginSchema
from services.auth_service import register_user, login_user, verify_user_email
from models.user import User
from utils.email import generate_verification_token, send_verification_email
from datetime import datetime, timedelta
router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register")
def register(
    data: RegisterSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user, message = register_user(db, data, background_tasks)
    
    if not user:
        raise HTTPException(status_code=400, detail=message)
    
    return {"message": message, "user_id": user.id}

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    token, message = login_user(db, data)
    
    if not token:
        raise HTTPException(status_code=400, detail=message)
    
    return {"access_token": token, "token_type": "bearer", "message": message}

@router.get("/verify-email")
def verify_email(token: str = Query(...), db: Session = Depends(get_db)):
    success, message = verify_user_email(db, token)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"message": message}

@router.post("/resend-verification")
def resend_verification(
    email: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    from utils.email import generate_verification_token, send_verification_email
    from datetime import datetime, timedelta
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Generate new token
    new_token = generate_verification_token(email)
    user.email_verification_token = new_token
    user.verification_token_expires = datetime.now() + timedelta(hours=24)
    db.commit()
    
    # Send new email using BackgroundTasks
    background_tasks.add_task(send_verification_email, user.email, user.name, new_token)
    
    return {"message": "Verification email resent. Check your inbox."}