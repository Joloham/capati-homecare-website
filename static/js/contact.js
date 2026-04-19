async function submitContact() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();
  const msg = document.getElementById("form-msg");
  const btn = document.querySelector("button[onclick='submitContact()']");

  msg.className = "form-message";
  msg.textContent = "";

  if (!name || !email || !message) {
    msg.textContent = "Please fill in all fields.";
    msg.classList.add("error");
    return;
  }

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message })
    });

    const data = await res.json();

    if (res.ok) {
      msg.textContent = "Message sent! We'll get back to you soon.";
      document.getElementById("name").value = "";
      document.getElementById("email").value = "";
      document.getElementById("message").value = "";

      // Start cooldown
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
