from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from config import MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM, MAIL_PORT, MAIL_SERVER
from itsdangerous import URLSafeTimedSerializer
from config import SECRET_KEY

# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_PORT=MAIL_PORT,
    MAIL_SERVER=MAIL_SERVER,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

# Token serializer
serializer = URLSafeTimedSerializer(SECRET_KEY)

def generate_verification_token(email: str):
    """Generate token for email verification"""
    return serializer.dumps(email, salt="email-verification")

def verify_token(token: str, expiration: int = 3600):
    """Verify email token"""
    try:
        email = serializer.loads(
            token, 
            salt="email-verification",
            max_age=expiration
        )
        return email
    except Exception:
        return None

async def send_verification_email(email: str, name: str, token: str):
    """Send real verification email"""
    
    verification_link = f"http://localhost:8000/verify-email?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; }}
            .container {{ max-width: 600px; margin: auto; padding: 20px; }}
            .button {{ background: #4CAF50; color: white; padding: 10px 20px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Welcome {name}!</h2>
            <p>Thank you for registering with Asian FX Signals.</p>
            <p>Click the button below to verify your email:</p>
            <p><a href="{verification_link}" class="button">Verify Email</a></p>
            <p>Or copy this link: {verification_link}</p>
            <p>This link expires in 24 hours.</p>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="Verify Your Email - Asian FX Signals",
        recipients=[email],
        body=html_content,
        subtype="html"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)