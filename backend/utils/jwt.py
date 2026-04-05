from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = "secret123"

def create_token(data: dict):
    data.update({"exp": datetime.utcnow() + timedelta(hours=2)})
    return jwt.encode(data, SECRET_KEY, algorithm="HS256")