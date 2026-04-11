import asyncio
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
import os
import sys

# Add backend2 to path to import settings
sys.path.append(os.path.join(os.getcwd(), "backend2"))
from config import settings

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

async def test_email():
    message = MessageSchema(
        subject="Test Email - Asian FX",
        recipients=[settings.MAIL_USERNAME],
        body="This is a test email to verify SMTP configuration.",
        subtype="plain"
    )
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print("SUCCESS: Email sent successfully!")
    except Exception as e:
        print(f"FAILURE: Email failed to send. Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_email())
