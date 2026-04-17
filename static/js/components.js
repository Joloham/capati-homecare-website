async function loadComponent(id, path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    const html = await res.text();
    document.getElementById(id).innerHTML = html;

    // Highlight active nav link
    if (id === "navbar-container") {
      const links = document.querySelectorAll("#navbar-container ul a");
      links.forEach(link => {
        if (link.href === window.location.href) {
          link.classList.add("active");
        }
      });

      // Hamburger toggle
      const toggle = document.getElementById("nav-toggle");
      const menu = document.getElementById("nav-menu");
      if (toggle && menu) {
        toggle.addEventListener("click", () => {
          menu.classList.toggle("open");
        });
      }
    }
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadComponent("navbar-container", "/static/components/navbar.html");
  loadComponent("footer-container", "/static/components/footer.html");
});
