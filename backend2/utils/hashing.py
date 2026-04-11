from passlib.context import CryptContext

# PBKDF2 context (More stable on Windows/modern Python than certain bcrypt versions)
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto"
)

# ================== HASH PASSWORD ==================
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

# ================== VERIFY PASSWORD ==================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password with hashed password"""
    return pwd_context.verify(plain_password, hashed_password)