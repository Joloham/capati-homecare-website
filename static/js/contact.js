async function submitContact() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();
  const msg = document.getElementById("form-msg");

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
    } else {
      msg.textContent = data.error || "Something went wrong.";
      msg.classList.add("error");
    }
  } catch (err) {
    msg.textContent = "Network error. Please try again.";
    msg.classList.add("error");
  }
}
