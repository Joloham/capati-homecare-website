document.addEventListener("DOMContentLoaded", () => {
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

  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const elementsToAnimate = document.querySelectorAll(
    ".card, .pricing-card, section, .hero, .gallery-grid img, .section-title, .section-sub, .hero h1, .hero p, .btn"
  );

  if (!("IntersectionObserver" in window)) {
    elementsToAnimate.forEach(el => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elementsToAnimate.forEach(el => {
    el.classList.add("fade-in");
  });

  setTimeout(() => {
    elementsToAnimate.forEach(el => {
      observer.observe(el);
    });
  }, 50);
});
