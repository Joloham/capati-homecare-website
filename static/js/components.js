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

  const animatableSelector =
    ".section-label, .section-title, .section-sub, .card, .pricing-card, .gallery-grid img";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add("visible");
      entry.target.addEventListener("transitionend", () => {
        entry.target.classList.remove("fade-in");
        entry.target.classList.remove("visible");
        entry.target.style.transitionDelay = "";
      }, { once: true });

      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });

  const shouldAnimate = (el) =>
    el.getBoundingClientRect().top >= window.innerHeight * 0.9;

  const applyStagger = (elements, step = 70, maxDelay = 350) => {
    let visibleIndex = 0;
    elements.forEach(el => {
      if (!shouldAnimate(el)) return;

      const delay = Math.min(visibleIndex * step, maxDelay);
      visibleIndex += 1;

      el.classList.add("fade-in");
      el.style.transitionDelay = `${delay}ms`;
      observer.observe(el);
    });
  };

  const grouped = new Set();
  document.querySelectorAll("section").forEach(section => {
    const items = Array.from(section.querySelectorAll(animatableSelector));
    if (!items.length) return;

    items.forEach(el => grouped.add(el));
    applyStagger(items);
  });

  const leftovers = Array.from(document.querySelectorAll(animatableSelector))
    .filter(el => !grouped.has(el));
  if (leftovers.length) {
    applyStagger(leftovers, 60, 300);
  }
});
