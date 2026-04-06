# routes/user.py

from fastapi import APIRouter, HTTPException, Depends
from typing import List

# 1️⃣ Router define karo
router = APIRouter(
    prefix="/users",        # URL me /users use hoga
    tags=["Users"]          # swagger me ye tag dikhega
)

# 2️⃣ Sample endpoint - get all users
@router.get("/", summary="Get all users")
async def get_users():
    return {"message": "List of all users"}

# 3️⃣ Sample endpoint - get single user by id
@router.get("/{user_id}", summary="Get user by ID")
async def get_user(user_id: int):
    # yahan database logic aayega
    return {"user_id": user_id, "name": "Demo User"}