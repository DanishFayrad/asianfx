# utils/email.py
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from config import settings
from itsdangerous import URLSafeTimedSerializer

# Email server configuration
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

# Token serializer for email verification
serializer = URLSafeTimedSerializer(settings.SECRET_KEY)

# -----------------------------
# Function 1: Generate & verify token
# -----------------------------
def generate_verification_token(email: str):
    return serializer.dumps(email, salt="email-verification")

def verify_token(token: str, expiration: int = 3600):
    try:
        email = serializer.loads(
            token,
            salt="email-verification",
            max_age=expiration
        )
        return email
    except Exception:
        return None

# -----------------------------
# Function 2: Send verification email
# -----------------------------
async def send_verification_email(email: str, name: str, token: str):
    verification_link = f"http://localhost:8000/verify-email?token={token}"
    
    html_content = f"""
    <html>
    <body>
        <h2>Welcome {name}!</h2>
        <p>Thank you for registering.</p>
        <p>Click the link below to verify your email:</p>
        <a href="{verification_link}">Verify Email</a>
        <p>Or copy this link: {verification_link}</p>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="Verify Your Email",
        recipients=[email],
        body=html_content,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)

# -----------------------------
# Function 3: Send signal notification
# -----------------------------
async def send_signal_notification(email: str, signal_info: str):
    html_content = f"""
    <html>
      <body>
        <h3>New Signal Added!</h3>
        <p>{signal_info}</p>
      </body>
    </html>
    """
    message = MessageSchema(
        subject="New Signal Notification",
        recipients=[email],
        body=html_content,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)