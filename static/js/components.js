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

    const elementsToAnimate = document.querySelectorAll(
      ".card, .pricing-card, section, .hero, .gallery-grid img, .section-title, .section-sub, .hero h1, .hero p, .btn"
    );

    // First, apply the initial hidden state to all elements
    elementsToAnimate.forEach(el => {
      el.classList.add("fade-in");
    });

    // Then, give the browser a tiny delay to render the hidden state
    // before starting to observe and trigger animations
    setTimeout(() => {
      elementsToAnimate.forEach(el => {
        observer.observe(el);
      });
    }, 50);
  });
