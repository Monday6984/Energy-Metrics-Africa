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

// Hero slider (home page only)
const heroSlider = document.getElementById("heroSlider");
if (heroSlider) {
  const slides = Array.from(heroSlider.querySelectorAll(".hero-slide"));
  const dots = Array.from(heroSlider.querySelectorAll(".hero-slider__dot"));
  const prevBtn = document.getElementById("heroPrev");
  const nextBtn = document.getElementById("heroNext");
  let current = slides.findIndex((s) => s.classList.contains("is-active"));
  if (current < 0) current = 0;
  let autoplayId = null;

  function goTo(index) {
    const next = (index + slides.length) % slides.length;
    if (next === current) return;
    slides[current].classList.remove("is-active");
    dots[current]?.classList.remove("is-active");
    dots[current]?.setAttribute("aria-selected", "false");
    current = next;
    slides[current].classList.add("is-active");
    dots[current]?.classList.add("is-active");
    dots[current]?.setAttribute("aria-selected", "true");
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayId = setInterval(() => goTo(current + 1), 7000);
  }
  function stopAutoplay() {
    if (autoplayId) clearInterval(autoplayId);
    autoplayId = null;
  }

  prevBtn?.addEventListener("click", () => {
    goTo(current - 1);
    startAutoplay();
  });
  nextBtn?.addEventListener("click", () => {
    goTo(current + 1);
    startAutoplay();
  });
  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      goTo(i);
      startAutoplay();
    });
  });

  heroSlider.addEventListener("mouseenter", stopAutoplay);
  heroSlider.addEventListener("mouseleave", startAutoplay);

  if (slides.length > 1) startAutoplay();
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

// FAQ accordion (service detail pages)
document.querySelectorAll(".faq-accordion").forEach((accordion) => {
  const items = Array.from(accordion.querySelectorAll(".faq-item"));

  function closeItem(item) {
    item.classList.remove("is-open");
    item.querySelector(".faq-item__q")?.setAttribute("aria-expanded", "false");
    const panel = item.querySelector(".faq-item__panel");
    if (panel) panel.style.maxHeight = null;
  }

  function openItem(item) {
    item.classList.add("is-open");
    item.querySelector(".faq-item__q")?.setAttribute("aria-expanded", "true");
    const panel = item.querySelector(".faq-item__panel");
    if (panel) panel.style.maxHeight = panel.scrollHeight + "px";
  }

  items.forEach((item) => {
    const btn = item.querySelector(".faq-item__q");
    btn?.addEventListener("click", () => {
      const wasOpen = item.classList.contains("is-open");
      items.forEach(closeItem);
      if (!wasOpen) openItem(item);
    });
  });
});

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
