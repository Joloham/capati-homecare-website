const SUPABASE_URL = "https://izhqaqpsuffkhkegwbbg.supabase.co";
const SUPABASE_KEY = "sb_publishable_mJnBA_xMaqIxfr3XgiJZeQ_pSfyqMJ-";
const BUCKET = "gallery";

// ── AUTH ──

async function adminLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const msg = document.getElementById("login-msg");

  msg.className = "form-message";
  msg.textContent = "";

  if (!email || !password) {
    msg.textContent = "Please enter your email and password.";
    msg.classList.add("error");
    return;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok && data.access_token) {
      sessionStorage.setItem("sb_access_token", data.access_token);
      sessionStorage.setItem("sb_user_email", data.user.email);
      window.location.href = "/admin/dashboard.html";
    } else {
      msg.textContent = data.error_description || "Invalid credentials.";
      msg.classList.add("error");
    }
  } catch (err) {
    msg.textContent = "Network error. Please try again.";
    msg.classList.add("error");
  }
}

// ── SESSION GUARD ──
// Call this on dashboard page to redirect if not logged in

function requireAuth() {
  const token = sessionStorage.getItem("sb_access_token");
  if (!token) {
    window.location.href = "/admin/login.html";
  }
  return token;
}

function getAdminEmail() {
  return sessionStorage.getItem("sb_user_email") || "Admin";
}

function adminLogout() {
  sessionStorage.clear();
  window.location.href = "/admin/login.html";
}

// ── UPLOAD ──

async function uploadPhotos(files) {
  const token = requireAuth();
  const statusEl = document.getElementById("upload-status");
  const previews = document.getElementById("upload-previews");

  statusEl.textContent = "";

  for (const file of files) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      statusEl.textContent = `Skipped ${file.name} — unsupported format.`;
      continue;
    }

    const filename = `${Date.now()}_${file.name}`;

    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "apikey": SUPABASE_KEY,
          "Content-Type": file.type,
          "x-upsert": "false"
        },
        body: file
      });

      if (res.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
        const img = document.createElement("img");
        img.src = publicUrl;
        img.alt = file.name;
        previews.appendChild(img);
        statusEl.textContent = "Upload successful!";
      } else {
        const err = await res.json();
        statusEl.textContent = `Failed to upload ${file.name}: ${err.error || "unknown error"}`;
      }
    } catch (err) {
      statusEl.textContent = `Error uploading ${file.name}.`;
      console.error(err);
    }
  }
}

// ── LOAD EXISTING GALLERY ON DASHBOARD ──

async function loadDashboardGallery() {
  const token = requireAuth();
  const container = document.getElementById("existing-photos");
  if (!container) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify({ limit: 100, offset: 0, prefix: "" })
    });

    const files = await res.json();

    if (!Array.isArray(files) || files.length === 0) {
      container.innerHTML = `<p style="color:var(--text-light);font-size:0.9rem;">No photos uploaded yet.</p>`;
      return;
    }

    container.innerHTML = files
      .filter(f => f.name)
      .map(f => {
        const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${f.name}`;
        return `
          <div style="position:relative;">
            <img src="${url}" alt="${f.name}" style="width:100%;height:130px;object-fit:cover;border-radius:var(--radius);border:1px solid var(--border);cursor:pointer;" onclick="openLightbox('${url}')"/>
            <button onclick="deletePhoto('${f.name}', this)" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.55);color:white;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:0.8rem;">✕</button>
          </div>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
  }
}

// ── LOAD MESSAGES ──

async function loadMessages() {
  const token = requireAuth();
  const container = document.getElementById("messages-list");
  if (!container) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts?order=created_at.desc`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
      }
    });

    const messages = await res.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      container.innerHTML = `<p style="color:var(--text-light);font-size:0.9rem;">No messages yet.</p>`;
      return;
    }

    container.innerHTML = messages.map(m => {
      const date = m.created_at
        ? new Date(m.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
        : "—";
      return `
        <div style="background:var(--warm-white);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;margin-bottom:1rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap;gap:0.5rem;">
            <strong style="font-family:'Playfair Display',serif;font-size:1rem;">${m.name}</strong>
            <span style="font-size:0.8rem;color:var(--text-light);">${date}</span>
          </div>
          <a href="mailto:${m.email}" style="font-size:0.875rem;color:var(--sage-dark);">${m.email}</a>
          <p style="margin-top:0.75rem;font-size:0.9rem;color:var(--text-mid);white-space:pre-wrap;">${m.message}</p>
        </div>`;
    }).join("");

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color:var(--terracotta);font-size:0.9rem;">Failed to load messages.</p>`;
  }
}

// ── DELETE PHOTO ──

async function deletePhoto(filename, btn) {
  const token = requireAuth();
  if (!confirm(`Delete "${filename}"?`)) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify({ prefixes: [filename] })
    });

    if (res.ok) {
      btn.closest("div").remove();
    } else {
      alert("Failed to delete photo.");
    }
  } catch (err) {
    console.error(err);
  }
}
