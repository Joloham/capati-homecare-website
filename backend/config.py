import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY")


required_env_vars = {
    "SUPABASE_URL": SUPABASE_URL,
    "SUPABASE_PUBLISHABLE_KEY": SUPABASE_PUBLISHABLE_KEY,
    "SUPABASE_SECRET_KEY": SUPABASE_SECRET_KEY,
    "FLASK_SECRET_KEY": FLASK_SECRET_KEY,
}

missing_env_vars = [
    name
    for name, value in required_env_vars.items()
    if not value or not value.strip()
]

if missing_env_vars:
    raise RuntimeError(
        "Missing required environment variables: "
        + ", ".join(missing_env_vars)
    )
