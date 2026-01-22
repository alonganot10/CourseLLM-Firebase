from fastapi import Depends, HTTPException, status
from .auth import get_current_user
from .config import get_settings

settings = get_settings()

# Demo-only allowlist for emulator runs (seed-demo uses uid="demo-teacher")
DEMO_TEACHER_UIDS = {"demo-teacher"}


async def is_teacher(user: dict = Depends(get_current_user)) -> dict:
    """
    Verify that the current user has teacher permissions.

    Production behavior:
      - Requires custom claim: role == "teacher"

    Emulator/demo behavior:
      - Allow the seeded demo teacher (uid in DEMO_TEACHER_UIDS) to act as teacher,
        since email/password sign-in in the Auth emulator won't include custom claims by default.
    """
    if user.get("role") == "teacher":
        return user

    if settings.FIREBASE_AUTH_EMULATOR_HOST and user.get("uid") in DEMO_TEACHER_UIDS:
        # treat demo teacher as teacher in emulator mode
        return {**user, "role": "teacher"}

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="User does not have 'teacher' permissions.",
    )
