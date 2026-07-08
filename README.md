# Golden Circle Homecare

A production website for a homecare business in Marikina City, Philippines; built solo from scratch.

**Live site:** https://www.goldencirclehomecare.com

---

## Overview

Golden Circle Homecare is a marketing + admin management site for a senior homecare service. It includes the web pages, a photo gallery, a contact form, and a password-protected admin dashboard for managing gallery photos and incoming inquiries.

---

## Tech Stack

**Backend**
- Python (Flask)
- Gunicorn (WSGI server)
- Supabase (PostgreSQL, Auth, Storage buckets)

**Frontend**
- Jinja2 templates
- Vanilla JavaScript
- Custom CSS

**Database / Auth / Storage**
- Supabase (PostgreSQL, Auth, Storage buckets)

**Infrastructure**
- Hosting: Render
- DNS / CDN / Security: Cloudflare
- Custom domain with SSL (Full Strict mode)

---

## Pages

- Home, About, Our Story, Services, Gallery, FAQ, Contact
- Admin Dashboard (login-protected):
  - Gallery management — upload, caption, delete photos
  - Contact inbox — view, mark read/unread, delete messages

---

## Features

- **Contact form** — stored in Supabase, rate-limited against spam/abuse
- **Photo gallery** — server-side image compression + WebP conversion on upload
- **Admin authentication** — Supabase Auth + Flask sessions, with IP-based login rate limiting
- **Dynamic SEO assets** — auto-generated `sitemap.xml`, `robots.txt`
- **Structured data** — `LocalBusiness` and `WebSite` JSON-LD schema, Open Graph tags
- **Caching** — Cloudflare Cache Rules for static assets, 1-week browser cache on `/static/*`, 6-month cache-control on gallery images stored in Supabase

---

## Security

- Fixed stored XSS vulnerabilities (photo captions, contact email field)
- IP-based rate limiting on admin login
- Full security header hardening: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- Secure session cookies (`SESSION_COOKIE_SECURE`)
- `ProxyFix` middleware for correct client IP/scheme detection behind the Cloudflare → Render proxy chain
- Bot management via Cloudflare (Bot Fight Mode, AI crawler controls) — verified against real firewall event logs

---

## Audit Results

| Tool | Result |
|---|---|
| SSL Labs (Qualys) | A+ |
| Mozilla HTTP Observatory | B (75/100) — CSP intentionally deferred for now due to inline JS/CSS architecture |
| Blacklight Privacy Scan | Zero trackers, zero third-party cookies |
| Google PageSpeed Insights | Desktop: 100 Performance / 100 Accessibility / 100 Best Practices / 100 SEO. Mobile: 92 Performance / 100 / 100 / 100 |
| WebPageTest | ~0.6s FCP/LCP, zero cumulative layout shift, no render-blocking third parties |

---

## Notes

- Built and iterated with heavy use of real diagnostic tools throughout (Google PageSpeed Insights, Cloudflare Analytics, WebPageTest, Blacklight Privacy Scan, Qualys SSL Labs, Mozilla Observatory) rather than assumptions.
- Used AI and Github repos to generate initial code, debug issues, and suggest changes/improvements/features.
