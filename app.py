from flask import Flask, send_from_directory, render_template, jsonify, Response, redirect, request
from werkzeug.middleware.proxy_fix import ProxyFix
from backend.config import FLASK_SECRET_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY
from backend.routes.upload import upload_bp
from backend.routes.contact import contact_bp
from backend.routes.admin import admin_bp, login_required
from supabase import create_client
from datetime import timedelta
import os

VALID_PAGES = {"about", "our-story", "services", "gallery", "faq", "contact"}
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)

# Trust X-Forwarded-* headers from 2 proxy hops: Cloudflare, then Render's own
# load balancer. Without this, request.remote_addr / request.scheme reflect
# the proxy, not the real client — breaks scheme detection (http vs https)
# and IP-based rate limiting elsewhere in the app.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=2, x_proto=2, x_host=1)

app.secret_key = FLASK_SECRET_KEY
app.config["SESSION_COOKIE_SECURE"] = True
app.permanent_session_lifetime = timedelta(hours=24)

# Register API blueprints
app.register_blueprint(upload_bp, url_prefix="/api")
app.register_blueprint(contact_bp, url_prefix="/api")
app.register_blueprint(admin_bp)

supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    if request.path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=604800"

    return response

# Public config for frontend JS
@app.route("/api/config")
def config():
    return jsonify({
        "supabase_url": SUPABASE_URL,
        "supabase_key": SUPABASE_PUBLISHABLE_KEY
    })

# Keep-alive ping for cron-job.org
@app.route("/ping")
def ping():
    try:
        supabase.table("contacts").select("id").limit(1).execute()
        return jsonify({"status": "awake"}), 200
    except Exception:
        return jsonify({"status": "error"}), 500

# Sitemap
@app.route("/sitemap.xml")
def sitemap():
    pages = [
        "/",
        "/about",
        "/our-story",
        "/services",
        "/gallery",
        #"/pricing",
        "/faq",
        "/contact"
    ]
    base_url = "https://www.goldencirclehomecare.com"
    urls = "\n".join([
        f"""  <url>
    <loc>{base_url}{page}</loc>
    <changefreq>monthly</changefreq>
    <priority>{'1.0' if page == '/' else '0.8'}</priority>
  </url>""" for page in pages
    ])
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{urls}
</urlset>"""
    return Response(xml, mimetype="application/xml")

# Favicon
@app.route("/favicon.ico")
def favicon():
    return send_from_directory(os.path.join(BASE_DIR, "static", "images"), "favicon.ico", mimetype="image/x-icon")

# Serve HTML pages
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/<page>")
def serve_page(page):
    if page not in VALID_PAGES:
        return render_template("404.html"), 404
    return render_template(f"{page}.html")

@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404

# Admin pages — server-side protected
@app.route("/admin/login")
def admin_login_page():
    from flask import session
    if session.get("sb_access_token"):
        return redirect("/admin/dashboard")
    return render_template("admin/login.html")

@app.route("/admin/<page>")
@login_required
def serve_admin_page(page):
    return render_template(f"admin/{page}.html")

@app.route("/robots.txt")
def robots():
    return send_from_directory(BASE_DIR, "robots.txt")

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
