async function loadComponent(id, path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    const html = await res.text();
    document.getElementById(id).innerHTML = html;

    if (id === "navbar-container") {
      const links = document.querySelectorAll("#navbar-container ul a");
      links.forEach(link => {
        if (link.href === window.location.href) {
          link.classList.add("active");
        }
      });

      const toggle = document.getElementById("nav-toggle");
      const menu = document.getElementById("nav-menu");
      if (toggle && menu) {
        toggle.addEventListener("click", () => {
          menu.classList.toggle("open");
          toggle.classList.toggle("open");
        });
      }
    }

    if (id === "footer-container") {
      const yearEl = document.getElementById("footer-year");
      if (yearEl) yearEl.textContent = new Date().getFullYear();
    }

  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadComponent("navbar-container", "/static/components/navbar.html");
  loadComponent("footer-container", "/static/components/footer.html");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".card, .pricing-card, section, .hero").forEach(el => {
    el.classList.add("fade-in");
    observer.observe(el);
  });
});
