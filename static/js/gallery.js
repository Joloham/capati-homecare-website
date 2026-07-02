let SUPABASE_URL = null;
let SUPABASE_KEY = null;
const BUCKET = "gallery";


/* ── XSS SANITIZATION ── */

function sanitize(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}


/* ── CONFIG ── */

async function loadConfig() {
  if (SUPABASE_URL) return;

  const res  = await fetch("/api/config");
  const data = await res.json();

  SUPABASE_URL = data.supabase_url;
  SUPABASE_KEY = data.supabase_key;
}


/* ── SKELETON LOADER ── */

function showSkeleton(container, count = 6) {
  container.innerHTML = Array(count).fill(`
    <div style="background:var(--warm-white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
      <div style="width:100%;height:200px;position:relative;overflow:hidden;background:#e8e0d8;">
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.4) 50%,transparent 100%);animation:shimmer 1.4s infinite;"></div>
      </div>
      <div style="padding:0.6rem 0.85rem;">
        <div style="height:12px;background:#e8e0d8;border-radius:4px;width:60%;position:relative;overflow:hidden;">
          <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.4) 50%,transparent 100%);animation:shimmer 1.4s infinite;"></div>
        </div>
      </div>
    </div>
  `).join("");
}


/* ── LIGHTBOX ── */

function openLightbox(url) {
  const lb = document.getElementById("lightbox");
  document.getElementById("lightbox-img").src = url;
  lb.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").style.display = "none";
  document.getElementById("lightbox-img").src = "";
  document.body.style.overflow = "";
}


/* ── GALLERY LOAD ── */

async function loadGallery() {
  const container = document.getElementById("gallery");

  showSkeleton(container);
  await loadConfig();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gallery?order=created_at.desc`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      container.innerHTML = `<p style="color: var(--text-light); font-size: 0.9rem;">No photos yet.</p>`;
      return;
    }

    container.innerHTML = rows.map(row => {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${row.filename}`;
      return `
        <div class="gallery-card" style="background:var(--warm-white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;cursor:pointer;" onclick="openLightbox('${url}')">
          <img src="${url}" style="width:100%;height:200px;object-fit:cover;display:block;" loading="lazy"/>
          ${row.caption ? `<div style="padding:0.6rem 0.85rem;"><p style="font-size:0.85rem;color:var(--text-mid);">${sanitize(row.caption)}</p></div>` : ""}
        </div>`;
    }).join("");

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color: var(--terracotta);">Failed to load gallery.</p>`;
  }
}


/* ── INIT ── */

document.addEventListener("DOMContentLoaded", () => {
  loadGallery();

  document.getElementById("lightbox").addEventListener("click", e => {
    if (e.target === document.getElementById("lightbox")) closeLightbox();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeLightbox();
  });
});
