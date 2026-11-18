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

  // interactive hero background — pointer parallax
  var visual = document.querySelector(".hero-visual");

  if (visual) {
    var sphere = visual.querySelector(".sphere");
    var orbits = Array.prototype.slice.call(visual.querySelectorAll(".orbit"));
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

    var tick = function () {
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;

      if (sphere) {
        sphere.style.transform =
          "translate3d(" + (cx * 34).toFixed(2) + "px," + (cy * 26).toFixed(2) + "px,0)";
      }

      orbits.forEach(function (orbit, i) {
        var depth = 10 + i * 9;
        orbit.style.transform =
          "translate3d(" + (-cx * depth).toFixed(2) + "px," + (-cy * depth).toFixed(2) + "px,0)";
      });

      visual.style.setProperty("--px", (cx * 64).toFixed(1) + "px");
      visual.style.setProperty("--py", (cy * 64).toFixed(1) + "px");

      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    };

    var aim = function (event) {
      tx = (event.clientX / window.innerWidth - 0.5) * 2;
      ty = (event.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", function (event) {
      // ignore touch drags; react to mouse and pen only
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      aim(event);
    }, { passive: true });

    // fallback for setups that never dispatch pointer events
    window.addEventListener("mousemove", aim, { passive: true });
  }

  /* ── static forms (contact + newsletter) ────────────────────────
     GitHub Pages cannot run a server, so submissions are relayed
     by FormSubmit straight to the inbox. If the relay cannot be
     reached we hand off to the visitor's mail client instead, so
     a form never dead-ends.                                       */

  var FORM_ENDPOINT = "https://formsubmit.co/ajax/walidmostafa2077@gmail.com";

  function initStaticForms() {
    var forms = Array.prototype.slice.call(document.querySelectorAll("form[data-static-form]"));
    if (!forms.length) return;

    forms.forEach(function (form) {
      var statusEl = form.querySelector("[data-form-status]");
      var button = form.querySelector("button[type='submit']");
      var kind = form.getAttribute("data-form-kind") || "contact";

      var say = function (text, state) {
        if (!statusEl) return;
        statusEl.textContent = text;
        if (state) statusEl.setAttribute("data-state", state);
        else statusEl.removeAttribute("data-state");
      };

      var collect = function () {
        var payload = {};
        Array.prototype.slice.call(form.elements).forEach(function (el) {
          if (!el.name || el.disabled) return;
          payload[el.name] = el.value;
        });
        return payload;
      };

      var mailtoFallback = function (payload) {
        var subject = kind === "subscribe" ? "Subscribe to the blog" : "Portfolio enquiry";
        var lines = [];
        Object.keys(payload).forEach(function (key) {
          if (key.charAt(0) === "_") return;
          var value = String(payload[key] == null ? "" : payload[key]).trim();
          if (!value) return;
          lines.push(key + ": " + value);
        });
        window.location.href =
          "mailto:walidmostafa2077@gmail.com" +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(lines.join("\n"));
      };

      var finish = function (ok, payload) {
        form.removeAttribute("data-busy");
        if (button) button.disabled = false;
        if (ok) {
          form.reset();
          say(
            kind === "subscribe"
              ? "You're on the list — thanks."
              : "Message sent — I'll get back to you soon.",
            "ok"
          );
        } else {
          say("Relay unreachable — opening your mail app instead.", "err");
          mailtoFallback(payload);
        }
      };

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (form.getAttribute("data-busy") === "1") return;

        var payload = collect();
        if (payload._honey) return;

        if (!window.fetch || !window.JSON) {
          finish(false, payload);
          return;
        }

        form.setAttribute("data-busy", "1");
        if (button) button.disabled = true;
        say(kind === "subscribe" ? "Subscribing…" : "Sending…");

        var settled = false;
        var timer = window.setTimeout(function () {
          if (settled) return;
          settled = true;
          finish(false, payload);
        }, 12000);

        var settle = function (ok) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          finish(ok, payload);
        };

        fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        })
          .then(function (response) {
            return response.json().catch(function () { return {}; });
          })
          .then(function (json) {
            settle(Boolean(json && (json.success === true || json.success === "true")));
          })
          .catch(function () { settle(false); });
      });
    });
  }

  initStaticForms();
})();
