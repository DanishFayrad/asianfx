from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas.notification import NotificationResponse, UnreadCountResponse
from services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def get_notification_service(db: Session = Depends(get_db)):
    return NotificationService(db)

# ========== User Notification APIs ==========

@router.get("/{user_id}", response_model=List[NotificationResponse])
def get_user_notifications(
    user_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: NotificationService = Depends(get_notification_service)
):
    """Get all notifications for a user"""
    return service.get_user_notifications(user_id, limit, offset)

@router.get("/{user_id}/unread/count", response_model=UnreadCountResponse)
def get_unread_count(
    user_id: int,
    service: NotificationService = Depends(get_notification_service)
):
    """Get unread notifications count"""
    count = service.get_unread_count(user_id)
    return UnreadCountResponse(unread_count=count)

@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    user_id: int = Query(..., description="User ID for verification"),
    service: NotificationService = Depends(get_notification_service)
):
    """Mark a notification as read"""
    notification = service.mark_as_read(notification_id, user_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read", "notification_id": notification_id}

@router.put("/{user_id}/mark-all-read")
def mark_all_as_read(
    user_id: int,
    service: NotificationService = Depends(get_notification_service)
):
    """Mark all notifications as read for a user"""
    count = service.mark_all_as_read(user_id)
    return {"message": f"{count} notifications marked as read"}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    user_id: int = Query(..., description="User ID for verification"),
    service: NotificationService = Depends(get_notification_service)
):
    """Delete a notification"""
    success = service.delete_notification(notification_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted successfully"}

@router.delete("/{user_id}/delete-all")
def delete_all_notifications(
    user_id: int,
    service: NotificationService = Depends(get_notification_service)
):
    """Delete all notifications for a user"""
    count = service.delete_all_notifications(user_id)
    return {"message": f"{count} notifications deleted"}