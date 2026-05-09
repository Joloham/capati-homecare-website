const LIMITS = {
  name: 50,
  phone: 20,
  email: 50,
  message: 1000
};

async function submitContact() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();
  const msg = document.getElementById("form-msg");
  const btn = document.querySelector("button[onclick='submitContact()']");

  msg.className = "form-message";
  msg.textContent = "";

  if (!name || !email || !message) {
    msg.textContent = "Please fill in all required fields.";
    msg.classList.add("error");
    return;
  }

  if (name.length > LIMITS.name) {
    msg.textContent = `Name must be ${LIMITS.name} characters or less.`;
    msg.classList.add("error");
    return;
  }

  if (phone && phone.length > LIMITS.phone) {
    msg.textContent = `Phone must be ${LIMITS.phone} characters or less.`;
    msg.classList.add("error");
    return;
  }

  if (email.length > LIMITS.email) {
    msg.textContent = `Email must be ${LIMITS.email} characters or less.`;
    msg.classList.add("error");
    return;
  }

  if (message.length > LIMITS.message) {
    msg.textContent = `Message must be ${LIMITS.message} characters or less.`;
    msg.classList.add("error");
    return;
  }

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, message })
    });

    const data = await res.json();

    if (res.ok) {
      msg.textContent = "Message sent! We'll get back to you soon.";
      document.getElementById("name").value = "";
      document.getElementById("phone").value = "";
      document.getElementById("email").value = "";
      document.getElementById("message").value = "";
      updateCounter();

      let seconds = 30;
      btn.disabled = true;
      btn.style.opacity = "0.6";
      btn.style.cursor = "not-allowed";

      const interval = setInterval(() => {
        btn.textContent = `Wait ${seconds}s`;
        seconds--;
        if (seconds < 0) {
          clearInterval(interval);
          btn.disabled = false;
          btn.style.opacity = "1";
          btn.style.cursor = "pointer";
          btn.textContent = "Send Message";
        }
      }, 1000);

    } else {
      msg.textContent = data.error || "Something went wrong.";
      msg.classList.add("error");
    }
  } catch (err) {
    msg.textContent = "Network error. Please try again.";
    msg.classList.add("error");
  }
}

function updateCounter() {
  const message = document.getElementById("message");
  const counter = document.getElementById("msg-counter");
  if (!message || !counter) return;
  const remaining = LIMITS.message - message.value.length;
  counter.textContent = `${message.value.length} / ${LIMITS.message}`;
  counter.style.color = remaining < 50 ? "var(--terracotta)" : "var(--text-light)";
}

document.addEventListener("DOMContentLoaded", () => {
  const message = document.getElementById("message");
  if (message) message.addEventListener("input", updateCounter);
});
