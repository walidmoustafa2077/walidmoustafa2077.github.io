(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  // active nav link
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav a[href^='#']"));
  var sections = links
    .map(function (link) {
      var id = link.getAttribute("href").slice(1);
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var setActive = function (id) {
      links.forEach(function (link) {
        link.classList.toggle(
          "is-active",
          link.getAttribute("href") === "#" + id
        );
      });
    };

    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    sections.forEach(function (section) { navObserver.observe(section); });
  }

  // project cards open a modal instead of expanding in place
  var projectLinks = Array.prototype.slice.call(document.querySelectorAll(".project-in"));
  var supportsDialog = typeof HTMLDialogElement !== "undefined" && "showModal" in HTMLDialogElement.prototype;

  if (projectLinks.length && supportsDialog) {
    projectLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        var dialog = document.querySelector(link.getAttribute("href"));
        if (!dialog) return;
        event.preventDefault();
        dialog.showModal();
      });
    });

    Array.prototype.slice.call(document.querySelectorAll(".modal")).forEach(function (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
      });

      var closeBtn = dialog.querySelector("[data-close]");
      if (closeBtn) closeBtn.addEventListener("click", function () { dialog.close(); });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      Array.prototype.slice.call(document.querySelectorAll(".modal[open]")).forEach(function (dialog) {
        dialog.close();
      });
    });
  }

  // interactive hero background — pointer parallax, desktop pointers only
  var visual = document.querySelector(".hero-visual");
  var finePointer =
    !reduced &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (visual && finePointer) {
    var sphere = visual.querySelector(".sphere");
    var orbits = Array.prototype.slice.call(visual.querySelectorAll(".orbit"));
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

    var tick = function () {
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;

      if (sphere) {
        sphere.style.transform =
          "translate3d(" + (cx * 22).toFixed(2) + "px," + (cy * 16).toFixed(2) + "px,0)";
      }

      orbits.forEach(function (orbit, i) {
        var depth = 6 + i * 7;
        orbit.style.transform =
          "translate3d(" + (-cx * depth).toFixed(2) + "px," + (-cy * depth).toFixed(2) + "px,0)";
      });

      visual.style.setProperty("--px", (cx * 46).toFixed(1) + "px");
      visual.style.setProperty("--py", (cy * 46).toFixed(1) + "px");

      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    };

    window.addEventListener("pointermove", function (event) {
      tx = (event.clientX / window.innerWidth - 0.5) * 2;
      ty = (event.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }
})();
