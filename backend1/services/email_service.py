from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from itsdangerous import URLSafeTimedSerializer
from config import settings

# ========== Email Configuration ==========
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS,
    VALIDATE_CERTS=settings.VALIDATE_CERTS
)

# ========== Token Serializer ==========
serializer = URLSafeTimedSerializer(settings.SECRET_KEY)

def generate_verification_token(email: str) -> str:
    """Generate token for email verification"""
    return serializer.dumps(email, salt="email-verification")

def verify_token(token: str, expiration: int = settings.VERIFICATION_TOKEN_EXPIRY):
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
    """Send verification email to user"""
    
    verification_link = f"http://localhost:8000/api/verify-email?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 50px auto;
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }}
            .header {{
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 2px solid #4CAF50;
            }}
            .header h1 {{
                color: #4CAF50;
                margin: 0;
            }}
            .content {{
                padding: 30px 20px;
                text-align: center;
            }}
            .button {{
                background-color: #4CAF50;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                display: inline-block;
                margin: 20px 0;
                font-size: 16px;
            }}
            .button:hover {{
                background-color: #45a049;
            }}
            .footer {{
                text-align: center;
                padding-top: 20px;
                font-size: 12px;
                color: #777;
                border-top: 1px solid #ddd;
            }}
            .warning {{
                color: #ff9800;
                font-size: 12px;
                margin-top: 10px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome {name}!</h1>
            </div>
            <div class="content">
                <p>Thank you for registering with <strong>Asian FX Signals</strong>.</p>
                <p>Please verify your email address to activate your account:</p>
                <a href="{verification_link}" class="button">Verify Email</a>
                <p class="warning">⚠️ This link will expire in 1 hour</p>
                <p>Or copy this link: <br><small>{verification_link}</small></p>
            </div>
            <div class="footer">
                <p>Asian FX Signals — Professional Trading Signals</p>
                <p>If you didn't create an account, please ignore this email.</p>
            </div>
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