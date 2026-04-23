from flask import Flask, send_from_directory
from backend.config import FLASK_SECRET_KEY
from backend.routes.upload import upload_bp
from backend.routes.contact import contact_bp
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)

app.secret_key = FLASK_SECRET_KEY

# Register API blueprints
app.register_blueprint(upload_bp, url_prefix="/api")
app.register_blueprint(contact_bp, url_prefix="/api")

# Favicon
@app.route("/favicon.ico")
def favicon():
    return send_from_directory(os.path.join(BASE_DIR, "static", "images"), "favicon.svg", mimetype="image/svg+xml")

# Serve HTML pages
@app.route("/")
def index():
    return send_from_directory(os.path.join(BASE_DIR, "templates"), "index.html")

@app.route("/<page>.html")
def serve_page(page):
    return send_from_directory(os.path.join(BASE_DIR, "templates"), f"{page}.html")

@app.route("/admin/<page>.html")
def serve_admin_page(page):
    return send_from_directory(os.path.join(BASE_DIR, "templates", "admin"), f"{page}.html")

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
