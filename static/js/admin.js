let SUPABASE_URL = null;
let SUPABASE_KEY = null;
let BUCKET = "gallery";

async function loadConfig() {
  if (SUPABASE_URL) return;
  const res = await fetch("/api/config");
  const data = await res.json();
  SUPABASE_URL = data.supabase_url;
  SUPABASE_KEY = data.supabase_key;
}

// ── AUTH ──

async function adminLogin() {
  await loadConfig();
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
      window.location.href = "/admin/dashboard";
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

function requireAuth() {
  const token = localStorage.getItem("sb_access_token");
  if (!token) {
    window.location.href = "/admin/login";
  }
  return token;
}

function getAdminEmail() {
  return localStorage.getItem("sb_user_email") || "Admin";
}

function adminLogout() {
  localStorage.clear();
  window.location.href = "/admin/login";
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

        const wrapper = createPhotoCard(publicUrl, data.filename, null);
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

// ── PHOTO CARD ──

function createPhotoCard(url, filename, caption) {
  const wrapper = document.createElement("div");
  wrapper.dataset.filename = filename;
  wrapper.style.cssText = "position:relative;background:var(--warm-white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;";
  wrapper.innerHTML = `
    <img src="${url}" alt="" style="width:100%;height:130px;object-fit:cover;cursor:pointer;" onclick="openLightbox('${url}')"/>
    <div style="padding:0.5rem 0.6rem;">
      <p class="photo-caption" style="font-size:0.8rem;color:var(--text-mid);min-height:1.2em;">${caption || "<span style='color:var(--text-light);font-style:italic;'>No caption</span>"}</p>
      <div style="display:flex;gap:0.5rem;margin-top:0.4rem;">
        <button onclick="editCaption(this, '${filename}')" style="font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:50px;border:1px solid var(--sage);background:transparent;color:var(--sage-dark);cursor:pointer;">Edit</button>
        <button onclick="deletePhoto('${filename}', this)" style="font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:50px;border:1px solid var(--terracotta);background:transparent;color:var(--terracotta);cursor:pointer;">Delete</button>
      </div>
    </div>`;
  return wrapper;
}

// ── EDIT CAPTION ──

function editCaption(btn, filename) {
  const card = btn.closest("div[data-filename]");
  const captionEl = card.querySelector(".photo-caption");
  const currentCaption = captionEl.dataset.caption || "";

  captionEl.innerHTML = `<input type="text" value="${currentCaption}" maxlength="100" style="width:100%;font-size:0.8rem;padding:0.25rem 0.4rem;border:1px solid var(--sage);border-radius:6px;font-family:'Lato',sans-serif;"/>`;

  const actionDiv = btn.closest("div");
  actionDiv.innerHTML = `
    <button onclick="saveCaption(this, '${filename}')" style="font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:50px;border:none;background:var(--sage);color:white;cursor:pointer;">Save</button>
    <button onclick="cancelEdit(this, '${filename}', '${currentCaption}')" style="font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:50px;border:1px solid var(--border);background:transparent;color:var(--text-mid);cursor:pointer;">Cancel</button>`;
}

async function saveCaption(btn, filename) {
  await loadConfig();
  const token = requireAuth();
  const card = btn.closest("div[data-filename]");
  const input = card.querySelector("input");
  const caption = input.value.trim();

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/gallery?filename=eq.${encodeURIComponent(filename)}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ caption })
    });

    const captionEl = card.querySelector(".photo-caption");
    captionEl.dataset.caption = caption;
    captionEl.innerHTML = caption || "<span style='color:var(--text-light);font-style:italic;'>No caption</span>";

    const actionDiv = btn.closest("div");
    actionDiv.innerHTML = `
      <button onclick="editCaption(this, '${filename}')" style="font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:50px;border:1px solid var(--sage);background:transparent;color:var(--sage-dark);cursor:pointer;">Edit</button>
      <button onclick="deletePhoto('${filename}', this)" style="font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:50px;border:1px solid var(--terracotta);background:transparent;color:var(--terracotta);cursor:pointer;">Delete</button>`;

  } catch (err) {
    console.error(err);
  }
}

function cancelEdit(btn, filename, originalCaption) {
  const card = btn.closest("div[data-filename]");
  const captionEl = card.querySelector(".photo-caption");
  captionEl.innerHTML = originalCaption || "<span style='color:var(--text-light);font-style:italic;'>No caption</span>";

  const actionDiv = btn.closest("div");
  actionDiv.innerHTML = `
    <button onclick="editCaption(this, '${filename}')" style="font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:50px;border:1px solid var(--sage);background:transparent;color:var(--sage-dark);cursor:pointer;">Edit</button>
    <button onclick="deletePhoto('${filename}', this)" style="font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:50px;border:1px solid var(--terracotta);background:transparent;color:var(--terracotta);cursor:pointer;">Delete</button>`;
}

// ── LOAD EXISTING GALLERY ON DASHBOARD ──

async function loadDashboardGallery() {
  await loadConfig();
  const token = requireAuth();
  const container = document.getElementById("existing-photos");
  if (!container) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gallery?order=created_at.desc`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
      }
    });

    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      container.innerHTML = `<p style="color:var(--text-light);font-size:0.9rem;">No photos uploaded yet.</p>`;
      return;
    }

    container.innerHTML = "";
    rows.forEach(row => {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${row.filename}`;
      const card = createPhotoCard(url, row.filename, row.caption);
      container.appendChild(card);
    });

  } catch (err) {
    console.error(err);
  }
}

// ── DELETE PHOTO ──

async function deletePhoto(filename, btn) {
  await loadConfig();
  const token = requireAuth();
  if (!confirm(`Delete this photo?`)) return;

  try {
    // Delete from storage
    const storageRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY
      }
    });

    if (!storageRes.ok) {
      const err = await storageRes.json();
      alert(`Failed to delete: ${err.error || JSON.stringify(err)}`);
      return;
    }

    // Delete from gallery table
    await fetch(`${SUPABASE_URL}/rest/v1/gallery?filename=eq.${encodeURIComponent(filename)}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY
      }
    });

    btn.closest("div[data-filename]").remove();

  } catch (err) {
    console.error(err);
    alert("Network error while deleting.");
  }
}

// ── MESSAGES ──

const MSG_PAGE_SIZE = 5;
let msgOffset = 0;
let msgTotal = 0;

async function loadMessages(append = false) {
  await loadConfig();
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
  await loadConfig();
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

    const dot = card.querySelector(".unread-dot");
    if (dot) dot.style.display = nowRead ? "none" : "inline-block";

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
  await loadConfig();
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
