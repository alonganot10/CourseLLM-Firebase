from fastapi import Depends, HTTPException, status
from .auth import get_current_user

async def is_teacher(user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency to verify that the current user has 'teacher' permissions.

    Assumes a custom claim 'role' is present in the Firebase ID token.
    Raises 403 if the user is not a teacher.
    """
    if user.get("role") != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have 'teacher' permissions.",
        )
    return user
