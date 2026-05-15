/* ── MAIN.JS — shared across all pages ─────────────────── */

// Active nav link from URL (clean URLs)
(function setActiveNav() {
  const pathname = window.location.pathname;
  const isHome = pathname === "/" || pathname === "/index.html";
  const currentPage = isHome
    ? "/"
    : pathname.replace(/^\/|\/$/g, "").split("/")[0];

  document.querySelectorAll("[data-nav]").forEach((el) => {
    const navPage =
      el.dataset.nav === "/" ? "/" : el.dataset.nav.replace(".html", "");
    if (currentPage === navPage || (isHome && navPage === "/")) {
      el.classList.add("is-active");
    }
  });
})();

// Mobile hamburger
const hamburger = document.getElementById("hamburger");
const drawer = document.getElementById("nav-drawer");
const body = document.body;

if (hamburger && drawer) {
  hamburger.addEventListener("click", () => {
    const open = hamburger.classList.toggle("is-open");
    drawer.classList.toggle("is-open", open);
    body.style.overflow = open ? "hidden" : "";
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (
      drawer.classList.contains("is-open") &&
      !drawer.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      hamburger.classList.remove("is-open");
      drawer.classList.remove("is-open");
      body.style.overflow = "";
    }
  });

  // Close on link click
  drawer.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      hamburger.classList.remove("is-open");
      drawer.classList.remove("is-open");
      body.style.overflow = "";
    });
  });
}

// Scroll reveal
const revealObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealObs.unobserve(e.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
);

document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));

// Contact form (contact.html only)
const form = document.getElementById("contactForm");
const successMsg = document.getElementById("formSuccess");
if (form && successMsg) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    successMsg.style.display = "block";
    form.reset();
    setTimeout(() => {
      successMsg.style.display = "none";
    }, 5000);
  });
}
