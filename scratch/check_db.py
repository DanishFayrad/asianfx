import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend2 to path
sys.path.append(os.path.join(os.getcwd(), "backend2"))
from config import settings
from models.user import User

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    users = db.query(User).order_by(User.id.desc()).limit(5).all()
    print("Latest Users in Database:")
    for user in users:
        print(f"ID: {user.id}, Name: {user.name}, Email: {user.email}, Verified: {user.is_verified}")
except Exception as e:
    print(f"Error checking users: {str(e)}")
finally:
    db.close()
