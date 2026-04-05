from fastapi import BackgroundTasks
from models.user import User
from utils.hashing import hash_password, verify_password
from utils.jwt import create_token
from utils.email import generate_verification_token, send_verification_email
from datetime import datetime, timedelta

def register_user(db, data, background_tasks: BackgroundTasks):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        return None, "Email already registered"
    
    # Generate verification token
    token = generate_verification_token(data.email)
    token_expires = datetime.now() + timedelta(hours=24)
    
    # Create user
    user = User(
        name=data.name,
        email=data.email,
        password=hash_password(data.password),
        is_email_verified=False,
        email_verification_token=token,
        verification_token_expires=token_expires
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Send verification email using BackgroundTasks
    background_tasks.add_task(send_verification_email, user.email, user.name, token)
    
    return user, "Verification email sent. Please verify your email."

def login_user(db, data):
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not verify_password(data.password, user.password):
        return None, "Invalid credentials"
    
    # Check if email is verified
    if not user.is_email_verified:
        return None, "Please verify your email first. Check your inbox."
    
    token = create_token({"user_id": user.id})
    return token, "Login successful"

def verify_user_email(db, token):
    from utils.email import verify_token
    
    email = verify_token(token, expiration=86400)
    
    if not email:
        return False, "Invalid or expired verification link"
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return False, "User not found"
    
    if user.is_email_verified:
        return False, "Email already verified"
    
    user.is_email_verified = True
    user.email_verification_token = None
    user.verification_token_expires = None
    db.commit()
    
    return True, "Email verified successfully! You can now login."