from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from itsdangerous import URLSafeTimedSerializer
from config import settings

# ==================== Email Configuration ====================
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

# ==================== Token Serializer ====================
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

# ==================== Public URL ====================
# Replace this with your actual deployed server or frontend URL later
DEPLOYED_URL = "http://127.0.0.1:5500"

def generate_verification_link(token: str) -> str:
    """Create verification link using public URL"""
    return f"{settings.FRONTEND_URL}/verify-email?token={token}"

# ==================== Send Verification Email ====================
async def send_verification_email(email: str, name: str, token: str):
    """Send verification email to user"""
    verification_link = f"{settings.FRONTEND_URL}/Frontend/verify-email.html?token={token}"
    
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
    try:
        await fm.send_message(message)
        print(f"DEBUG: Verification email sent to {email}")
    except Exception as e:
        print(f"ERROR: Failed to send verification email to {email}: {str(e)}")

# ==================== Reset Password ====================

def generate_reset_password_token(email: str) -> str:
    """Generate token for remote password reset"""
    return serializer.dumps(email, salt="password-reset")

def verify_reset_password_token(token: str, expiration: int = 3600):
    """Verify reset password token (expires in 1 hour)"""
    try:
        email = serializer.loads(
            token, 
            salt="password-reset",
            max_age=expiration
        )
        return email
    except Exception:
        return None

async def send_reset_password_email(email: str, name: str, token: str):
    """Send password reset email to user"""
    
    reset_link = f"{settings.FRONTEND_URL}/Frontend/reset-password.html?token={token}"
    
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
                border-bottom: 2px solid #2196F3;
            }}
            .header h1 {{
                color: #2196F3;
                margin: 0;
            }}
            .content {{
                padding: 30px 20px;
                text-align: center;
            }}
            .button {{
                background-color: #2196F3;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                display: inline-block;
                margin: 20px 0;
                font-size: 16px;
            }}
            .button:hover {{
                background-color: #0b7dda;
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
                <h1>🔒 Reset Your Password</h1>
            </div>
            <div class="content">
                <p>Hello {name},</p>
                <p>We received a request to reset the password for your <strong>Asian FX Signals</strong> account.</p>
                <a href="{reset_link}" class="button">Reset Password</a>
                <p class="warning">⚠️ This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
                <p>Or copy this link: <br><small>{reset_link}</small></p>
            </div>
            <div class="footer">
                <p>Asian FX Signals — Professional Trading Signals</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="Password Reset Request - Asian FX Signals",
        recipients=[email],
        body=html_content,
        subtype="html"
    )
    
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print(f"DEBUG: Password reset email sent to {email}")
    except Exception as e:
        print(f"ERROR: Failed to send reset email to {email}: {str(e)}")

# ==================== Consultation Email ====================

async def send_consultation_email(full_name: str, email: str, phone: str, message_body: str):
    """Send consultation details to admin email"""
    html_content = f"""
    <h2>New Consultation Request from {full_name}</h2>
    <p><strong>Name:</strong> {full_name}</p>
    <p><strong>Email:</strong> {email}</p>
    <p><strong>Phone:</strong> {phone}</p>
    <p><strong>Message:</strong><br/>{message_body}</p>
    """
    
    msg = MessageSchema(
        subject=f"New Consultation Request - {full_name}",
        recipients=[settings.MAIL_USERNAME], # Send to the admin defined in config
        body=html_content,
        subtype="html"
    )
    
    fm = FastMail(conf)
    try:
        await fm.send_message(msg)
        print(f"DEBUG: Consultation email sent for {full_name}")
    except Exception as e:
        print(f"ERROR: Failed to send consultation email: {str(e)}")