# fix_everything.py
from sqlalchemy import create_engine, text
from config import settings

print("🔧 Starting fix...")

# Remove database name from URL to connect to default postgres database
default_url = settings.DATABASE_URL.rsplit('/', 1)[0] + '/postgres'
engine = create_engine(default_url)

with engine.connect() as conn:
    conn.execution_options(isolation_level="AUTOCOMMIT")
    
    # Kill all active connections to the database
    try:
        conn.execute(text("""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'asian_fx_db'
            AND pid <> pg_backend_pid()
        """))
        print("✅ Killed active connections")
    except:
        pass
    
    # Drop database if exists
    try:
        conn.execute(text("DROP DATABASE IF EXISTS asian_fx_db"))
        print("✅ Dropped old database")
    except Exception as e:
        print(f"⚠️ Drop error (ignoring): {e}")
    
    # Create fresh database
    try:
        conn.execute(text("CREATE DATABASE asian_fx_db"))
        print("✅ Created fresh database")
    except Exception as e:
        print(f"⚠️ Create error (ignoring): {e}")

print("✅ Database reset complete!")
print("🚀 Now run: uvicorn main:app --reload --port 8000")