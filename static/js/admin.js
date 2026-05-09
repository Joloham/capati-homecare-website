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
      localStorage.setItem("sb_access_token", data.access_token);
      localStorage.setItem("sb_user_email", data.user.email);
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
  const token = localStorage.getItem("sb_access_token");
  if (!token) {
    window.location.href = "/admin/login.html";
  }
  return token;
}

function getAdminEmail() {
  return localStorage.getItem("sb_user_email") || "Admin";
}

function adminLogout() {
  localStorage.clear();
  window.location.href = "/admin/login.html";
}

// ── STAGING ──

let stagedFiles = [];

function stageFiles(files) {
  const newFiles = Array.from(files);
  stagedFiles = [...stagedFiles, ...newFiles];
  renderStaging();
}

function renderStaging() {
  const area = document.getElementById("staging-area");
  const previews = document.getElementById("staging-previews");
  const count = document.getElementById("staging-count");

  if (stagedFiles.length === 0) {
    area.style.display = "none";
    return;
  }

  area.style.display = "block";
  count.textContent = `${stagedFiles.length} photo${stagedFiles.length > 1 ? "s" : ""} selected`;

  previews.innerHTML = "";
  stagedFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.innerHTML = `
      <img src="${url}" style="width:100%;height:130px;object-fit:cover;border-radius:var(--radius);border:1px solid var(--border);"/>
      <button onclick="removeStagedFile(${index})" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.55);color:white;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:0.8rem;">✕</button>
      <p style="font-size:0.7rem;color:var(--text-light);margin-top:0.3rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</p>`;
    previews.appendChild(wrapper);
  });
}

function removeStagedFile(index) {
  stagedFiles.splice(index, 1);
  renderStaging();
}

function clearStaging() {
  stagedFiles = [];
  document.getElementById("staging-area").style.display = "none";
  document.getElementById("file-input").value = "";
  document.getElementById("upload-status").textContent = "";
}

async function confirmUpload() {
  if (stagedFiles.length === 0) return;
  const statusEl = document.getElementById("upload-status");
  const existingPhotos = document.getElementById("existing-photos");

  statusEl.textContent = `Uploading ${stagedFiles.length} photo${stagedFiles.length > 1 ? "s" : ""}...`;

  let successCount = 0;

  for (const file of stagedFiles) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        successCount++;
        const publicUrl = data.url;

        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.innerHTML = `
          <img src="${publicUrl}" alt="" style="width:100%;height:130px;object-fit:cover;border-radius:var(--radius);border:1px solid var(--border);cursor:pointer;" onclick="openLightbox('${publicUrl}')"/>
          <button onclick="deletePhoto('${data.filename}', this)" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.55);color:white;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:0.8rem;">✕</button>`;

        const placeholder = existingPhotos.querySelector("p");
        if (placeholder) placeholder.remove();

        existingPhotos.prepend(wrapper);
      } else {
        statusEl.textContent = `Failed to upload ${file.name}: ${data.error || "unknown error"}`;
      }
    } catch (err) {
      console.error(err);
      statusEl.textContent = `Error uploading ${file.name}.`;
    }
  }

  statusEl.textContent = `${successCount} of ${stagedFiles.length} photo${stagedFiles.length > 1 ? "s" : ""} uploaded successfully.`;
  clearStaging();
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
      .sort((a, b) => {
        const tsA = parseInt(a.name.split("_")[0]) || 0;
        const tsB = parseInt(b.name.split("_")[0]) || 0;
        return tsB - tsA;
      })
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

// ── MESSAGES ──

const MSG_PAGE_SIZE = 5;
let msgOffset = 0;
let msgTotal = 0;

async function loadMessages(append = false) {
  const token = requireAuth();
  const container = document.getElementById("messages-list");
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (!container) return;

  if (!append) {
    msgOffset = 0;
    container.innerHTML = `<p style="color:var(--text-light);font-size:0.9rem;">Loading...</p>`;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/contacts?order=created_at.desc&limit=${MSG_PAGE_SIZE}&offset=${msgOffset}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json",
          "Prefer": "count=exact"
        }
      }
    );

    const total = parseInt(res.headers.get("content-range")?.split("/")[1] || "0");
    msgTotal = total;

    const messages = await res.json();

    if (!append) container.innerHTML = "";

    if (!Array.isArray(messages) || (messages.length === 0 && !append)) {
      container.innerHTML = `<p style="color:var(--text-light);font-size:0.9rem;">No messages yet.</p>`;
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
      return;
    }

    messages.forEach(m => {
      const date = m.created_at
        ? new Date(m.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
        : "—";
      const isRead = m.read === true;
      const card = document.createElement("div");
      card.id = `msg-${m.id}`;
      card.style.cssText = `background:${isRead ? "var(--cream)" : "var(--warm-white)"};border:1px solid ${isRead ? "var(--border)" : "var(--sage)"};border-radius:var(--radius);padding:1.25rem;margin-bottom:1rem;opacity:${isRead ? "0.5" : "1"};`;
      card.innerHTML = `
        <div class="msg-name-row" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap;gap:0.5rem;">
          <div style="display:flex;align-items:center;gap:0.6rem;min-width:0;">
            <span class="unread-dot" style="width:8px;height:8px;background:var(--sage);border-radius:50%;display:${isRead ? "none" : "inline-block"};flex-shrink:0;"></span>
            <strong style="font-family:'Playfair Display',serif;font-size:1rem;">${m.name}</strong>
          </div>
          <span style="font-size:0.8rem;color:var(--text-light);">${date}</span>
        </div>
        <a href="mailto:${m.email}" style="font-size:0.875rem;color:var(--sage-dark);">${m.email}</a>
        ${m.phone ? `<p style="font-size:0.875rem;color:var(--text-mid);margin-top:0.2rem;">📞 ${m.phone}</p>` : ""}
        <p style="margin-top:0.75rem;font-size:0.9rem;color:var(--text-mid);white-space:pre-wrap;word-break:break-word;">${m.message}</p>
        <div style="margin-top:1rem;display:flex;gap:0.75rem;">
          <button class="toggle-read-btn" onclick="toggleRead(${m.id}, ${isRead})" style="font-size:0.8rem;padding:0.3rem 0.85rem;border-radius:50px;border:1px solid var(--sage);background:transparent;color:var(--sage-dark);cursor:pointer;">
            ${isRead ? "Mark Unread" : "Mark Read"}
          </button>
          <button onclick="deleteMessage(${m.id})" style="font-size:0.8rem;padding:0.3rem 0.85rem;border-radius:50px;border:1px solid var(--terracotta);background:transparent;color:var(--terracotta);cursor:pointer;">
            Delete
          </button>
        </div>`;
      container.appendChild(card);
    });

    msgOffset += messages.length;

    if (loadMoreBtn) {
      loadMoreBtn.style.display = msgOffset < msgTotal ? "block" : "none";
    }

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color:var(--terracotta);font-size:0.9rem;">Failed to load messages.</p>`;
  }
}

async function toggleRead(id, currentlyRead) {
  const token = requireAuth();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ read: !currentlyRead })
    });

    if (!res.ok) return;

    const card = document.getElementById(`msg-${id}`);
    if (!card) return;

    const nowRead = !currentlyRead;
    card.style.background = nowRead ? "var(--cream)" : "var(--warm-white)";
    card.style.borderColor = nowRead ? "var(--border)" : "var(--sage)";
    card.style.opacity = nowRead ? "0.5" : "1";

    // Update dot
    const dot = card.querySelector(".unread-dot");
    if (dot) dot.style.display = nowRead ? "none" : "inline-block";

    // Update button text and toggle state
    const btn = card.querySelector(".toggle-read-btn");
    if (btn) {
      btn.textContent = nowRead ? "Mark Unread" : "Mark Read";
      btn.setAttribute("onclick", `toggleRead(${id}, ${nowRead})`);
    }

  } catch (err) {
    console.error(err);
  }
}

async function deleteMessage(id) {
  const token = requireAuth();
  if (!confirm("Delete this message?")) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY
      }
    });
    const card = document.getElementById(`msg-${id}`);
    if (card) card.remove();
    msgOffset = Math.max(0, msgOffset - 1);
    msgTotal = Math.max(0, msgTotal - 1);
    const loadMoreBtn = document.getElementById("load-more-btn");
    if (loadMoreBtn) loadMoreBtn.style.display = msgOffset < msgTotal ? "block" : "none";
  } catch (err) {
    console.error(err);
  }
}

// ── DELETE PHOTO ──

async function deletePhoto(filename, btn) {
  const token = requireAuth();
  if (!confirm(`Delete "${filename}"?`)) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY
      }
    });

    if (res.ok) {
      btn.closest("div").remove();
    } else {
      const err = await res.json();
      alert(`Failed to delete: ${err.error || JSON.stringify(err)}`);
    }
  } catch (err) {
    console.error(err);
    alert("Network error while deleting.");
  }
}
