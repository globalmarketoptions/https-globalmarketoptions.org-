(() => {
  "use strict";

  const initNavigation = () => {
    const drawer = document.getElementById("mobile-nav");
    const backdrop = document.getElementById("mobile-drawer-backdrop");
    const menuButton = document.getElementById("mobile-menu-button");
    const closeButton = document.getElementById("mobile-drawer-close");
    const year = document.getElementById("current-year");

    if (year) year.textContent = String(new Date().getFullYear());
    if (!drawer || !backdrop || !menuButton) return;

    const isOpen = () => drawer.classList.contains("open");

    const setOpen = (open) => {
      drawer.classList.toggle("open", open);
      backdrop.classList.toggle("is-visible", open);
      backdrop.hidden = !open;
      drawer.setAttribute("aria-hidden", String(!open));
      drawer.inert = !open;
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
      document.body.classList.toggle("drawer-open", open);
      if (open) {
        const firstLink = drawer.querySelector("a");
        if (firstLink) firstLink.focus({ preventScroll: true });
      } else {
        menuButton.focus({ preventScroll: true });
      }
    };

    // Native anchors perform navigation. JavaScript only manages drawer state.
    if (!menuButton.hasAttribute("onclick")) menuButton.addEventListener("click", () => setOpen(!isOpen()));
    if (closeButton) closeButton.addEventListener("click", () => setOpen(false));
    backdrop.addEventListener("click", () => setOpen(false));
    drawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) setOpen(false);
    });
    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 681px)").matches && isOpen()) setOpen(false);
    });

    setOpen(false);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavigation, { once: true });
  } else {
    initNavigation();
  }
})();
