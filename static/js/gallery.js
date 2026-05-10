const SUPABASE_URL = "https://izhqaqpsuffkhkegwbbg.supabase.co";
const SUPABASE_KEY = "sb_publishable_mJnBA_xMaqIxfr3XgiJZeQ_pSfyqMJ-";
const BUCKET = "gallery";

function showSkeleton(container, count = 6) {
  container.innerHTML = Array(count).fill(`
    <div style="width:100%;height:200px;border-radius:var(--radius);background:#e8e0d8;position:relative;overflow:hidden;">
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.4) 50%,transparent 100%);animation:shimmer 1.4s infinite;"></div>
    </div>
  `).join("");
}

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

async function loadGallery() {
  const container = document.getElementById("gallery");
  showSkeleton(container);

  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY
        },
        body: JSON.stringify({ limit: 100, offset: 0, prefix: "" })
      }
    );

    const files = await res.json();

    if (!Array.isArray(files) || files.length === 0) {
      container.innerHTML = `<p style="color: var(--text-light); font-size: 0.9rem;">No photos yet.</p>`;
      return;
    }

    container.innerHTML = files
      .filter(f => f.name)
      .sort((a, b) => {
        const tsA = parseInt(a.name.split("_")[0]) || 0;
        const tsB = parseInt(b.name.split("_")[0]) || 0;
        return tsB - tsA;
      })
      .map(f => {
        const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${f.name}`;
        return `<img src="${url}" alt="" loading="lazy" style="cursor:pointer;" onclick="openLightbox('${url}')"/>`;
      })
      .join("");

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color: var(--terracotta);">Failed to load gallery.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadGallery();

  document.getElementById("lightbox").addEventListener("click", e => {
    if (e.target === document.getElementById("lightbox")) closeLightbox();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeLightbox();
  });
});
