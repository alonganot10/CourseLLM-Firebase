import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import get_settings

# Get application settings
settings = get_settings()

# Define the security scheme for bearer tokens
http_bearer = HTTPBearer()

def init_firebase():
    """
    Initializes the Firebase Admin SDK idempotently, handling both production 
    and emulator environments based on settings.
    """
    try:
        # Check if the default app is already initialized
        firebase_admin.get_app()
    except ValueError:
        # If not initialized, proceed with initialization
        if settings.FIREBASE_AUTH_EMULATOR_HOST:
            # In development/emulator mode, initialize without explicit credentials.
            # The SDK will automatically connect to the emulator via the 
            # FIREBASE_AUTH_EMULATOR_HOST environment variable.
            firebase_admin.initialize_app(options={
                "projectId": settings.FIREBASE_PROJECT_ID
            })
        else:
            # In production (e.g., Cloud Run), use Application Default Credentials (ADC).
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, options={
                "projectId": settings.FIREBASE_PROJECT_ID
            })

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(http_bearer)
) -> dict:
    """
    FastAPI dependency that initializes Firebase, verifies the ID token from the
    Authorization header, and returns the decoded user data (claims).

    Raises:
        HTTPException(401): If the token is missing, malformed, invalid, or expired.
        HTTPException(500): For any other unexpected errors during token verification.
    """
    init_firebase()  # Ensure Firebase is initialized before proceeding

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Verify the ID token using the Firebase Admin SDK
        id_token = token.credentials
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except (auth.InvalidIdTokenError, ValueError) as e:
        # Catches malformed, invalid, or expired tokens
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ID token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # For any other unexpected errors, return a generic 500 error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error verifying token",
        )
