(() => {
  "use strict";

  const menuButton = document.getElementById("mobile-menu-button");
  const mobileNav = document.getElementById("mobile-nav");
  const backdrop = document.getElementById("mobile-drawer-backdrop");
  const closeButton = document.getElementById("mobile-drawer-close");
  const year = document.getElementById("current-year");

  if (year) year.textContent = String(new Date().getFullYear());
  if (!menuButton || !mobileNav || !backdrop) return;

  let previousFocus = null;

  const setDrawerOpen = (open) => {
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute(
      "aria-label",
      open ? "Close navigation menu" : "Open navigation menu"
    );
    mobileNav.setAttribute("aria-hidden", String(!open));
    mobileNav.inert = !open;
    mobileNav.classList.toggle("open", open);
    backdrop.hidden = !open;
    document.body.classList.toggle("drawer-open", open);

    if (open) {
      previousFocus = document.activeElement;
      if (closeButton) closeButton.focus();
    } else if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
      previousFocus = null;
    } else {
      menuButton.focus();
    }
  };

  menuButton.addEventListener("click", () => {
    setDrawerOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });

  if (closeButton) closeButton.addEventListener("click", () => setDrawerOpen(false));
  backdrop.addEventListener("click", () => setDrawerOpen(false));

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setDrawerOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      setDrawerOpen(false);
    }

    if (event.key === "Tab" && menuButton.getAttribute("aria-expanded") === "true") {
      const focusable = mobileNav.querySelectorAll(
        'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  const mobileQuery = window.matchMedia("(min-width: 1200px)");
  const closeOnDesktop = (event) => {
    if (event.matches && menuButton.getAttribute("aria-expanded") === "true") {
      setDrawerOpen(false);
    }
  };
  if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", closeOnDesktop);
  else if (mobileQuery.addListener) mobileQuery.addListener(closeOnDesktop);
})();