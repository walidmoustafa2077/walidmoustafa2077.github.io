/* ============================================================
   Blog — index rendering + article read time
   Reads window.__BLOG_POSTS__ (written by scripts/build-blog.js).
   ============================================================ */
(function () {
  "use strict";

  var PAGE_SIZE = 6;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readTimeLabel(minutes) {
    var n = Math.max(1, Math.round(minutes || 1));
    return n + " min read";
  }

  function formatDate(iso) {
    var parts = String(iso || "").split("-");
    if (parts.length !== 3) return "";
    var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    });
  }

  var CALENDAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
  var CLOCK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3.2 2"/></svg>';

  /* ── article pages: compute read time from the body ──────────── */

  function initReadTime() {
    var targets = document.querySelectorAll("[data-readtime]");
    var body = document.querySelector(".post-body");
    if (!targets.length || !body) return;

    var text = body.textContent.replace(/\s+/g, " ").trim();
    var words = text ? text.split(" ").length : 0;
    var minutes = Math.max(1, Math.round(words / 220));

    Array.prototype.forEach.call(targets, function (el) {
      el.textContent = readTimeLabel(minutes);
    });
  }

  /* ── newsletter: handled by the shared form handler in script.js ── */

  /* ── index page ──────────────────────────────────────────────── */

  function initIndex(data) {
    var grid = document.getElementById("blog-grid");
    if (!grid) return;

    var chipsWrap = document.getElementById("blog-filters");
    var searchInput = document.getElementById("blog-search");
    var sortSelect = document.getElementById("blog-sort");
    var emptyEl = document.getElementById("blog-empty");
    var pagerEl = document.getElementById("blog-pager");
    var emptyText = document.getElementById("blog-empty-text");

    var posts = (data && data.posts ? data.posts : []).slice();
    var categories = data && data.categories ? data.categories : {};

    var state = { category: "All", sort: "latest", query: "", page: 1 };

    if (!posts.length) {
      grid.innerHTML = "";
      if (emptyEl) {
        emptyEl.hidden = false;
        if (emptyText) emptyText.textContent = "No posts yet — add an HTML file to blog/ and rebuild.";
      }
      if (pagerEl) pagerEl.innerHTML = "";
      return;
    }

    /* restore state from the URL */
    try {
      var params = new URLSearchParams(window.location.search);
      var cat = params.get("category");
      if (cat && (cat === "All" || Object.prototype.hasOwnProperty.call(categories, cat))) {
        state.category = cat;
      }
      var page = Number(params.get("page"));
      if (page > 1) state.page = page;
      var sort = params.get("sort");
      if (sort === "oldest" || sort === "title") state.sort = sort;
    } catch (error) {
      /* no URL state */
    }

    function syncUrl() {
      try {
        var params = new URLSearchParams();
        if (state.category !== "All") params.set("category", state.category);
        if (state.sort !== "latest") params.set("sort", state.sort);
        if (state.page > 1) params.set("page", String(state.page));
        var query = params.toString();
        var url = window.location.pathname + (query ? "?" + query : "");
        window.history.replaceState(null, "", url);
      } catch (error) {
        /* file:// or sandboxed — ignore */
      }
    }

    /* filter chips, built once */
    if (chipsWrap) {
      var names = ["All"].concat(
        Object.keys(categories).sort(function (a, b) {
          return categories[b] - categories[a] || a.localeCompare(b);
        })
      );

      chipsWrap.innerHTML = names
        .map(function (name) {
          var count = name === "All" ? posts.length : categories[name];
          return (
            '<button class="b-chip" type="button" data-category="' +
            esc(name) +
            '" aria-pressed="' +
            (name === state.category ? "true" : "false") +
            '">' +
            esc(name === "All" ? "All posts" : name) +
            " <small>" +
            count +
            "</small></button>"
          );
        })
        .join("");

      chipsWrap.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-category]");
        if (!button) return;
        state.category = button.getAttribute("data-category");
        state.page = 1;
        Array.prototype.forEach.call(chipsWrap.querySelectorAll("button"), function (el) {
          el.setAttribute("aria-pressed", el === button ? "true" : "false");
        });
        render();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.query = searchInput.value.trim().toLowerCase();
        state.page = 1;
        render();
      });
    }

    if (sortSelect) {
      sortSelect.value = state.sort;
      sortSelect.addEventListener("change", function () {
        state.sort = sortSelect.value;
        state.page = 1;
        render();
      });
    }

    function filtered() {
      var list = posts.filter(function (post) {
        if (state.category !== "All" && post.category !== state.category) return false;
        if (!state.query) return true;
        var haystack = [post.title, post.excerpt, post.category]
          .concat(post.tags || [])
          .join(" ")
          .toLowerCase();
        return haystack.indexOf(state.query) !== -1;
      });

      if (state.sort === "oldest") {
        list.sort(function (a, b) { return a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug); });
      } else if (state.sort === "title") {
        list.sort(function (a, b) { return a.title.localeCompare(b.title); });
      } else {
        list.sort(function (a, b) { return b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug); });
      }

      return list;
    }

    function card(post) {
      var cover = post.cover
        ? '<img src="' + esc(post.cover) + '" alt="" loading="lazy" decoding="async">'
        : '<div class="cover-art"><span>' + esc(post.category) + "</span></div>";

      return (
        '<article class="post-card">' +
        '<a class="post-card-in" href="' + esc(post.url) + '">' +
        '<div class="post-cover">' + cover + "</div>" +
        '<div class="post-card-body">' +
        '<p class="post-cat">' + esc(post.category) + "</p>" +
        "<h2>" + esc(post.title) + "</h2>" +
        (post.excerpt ? '<p class="post-desc">' + esc(post.excerpt) + "</p>" : "") +
        '<p class="post-meta-row">' +
        "<span>" + CALENDAR + esc(formatDate(post.date)) + "</span>" +
        "<span>" + CLOCK + esc(readTimeLabel(post.readTime)) + "</span>" +
        '<span class="post-arrow" aria-hidden="true">→</span>' +
        "</p>" +
        "</div></a></article>"
      );
    }

    function pager(totalPages) {
      if (!pagerEl) return;
      if (totalPages <= 1) {
        pagerEl.innerHTML = "";
        return;
      }

      var buttons = [];
      buttons.push(
        '<button class="pager-btn" type="button" data-page="' +
          (state.page - 1) +
          '" aria-label="Previous page"' +
          (state.page === 1 ? " disabled" : "") +
          ">←</button>"
      );

      for (var i = 1; i <= totalPages; i++) {
        buttons.push(
          '<button class="pager-btn" type="button" data-page="' +
            i +
            '" aria-label="Page ' +
            i +
            '"' +
            (i === state.page ? ' aria-current="page"' : "") +
            ">" +
            i +
            "</button>"
        );
      }

      buttons.push(
        '<button class="pager-btn" type="button" data-page="' +
          (state.page + 1) +
          '" aria-label="Next page"' +
          (state.page === totalPages ? " disabled" : "") +
          ">→</button>"
      );

      pagerEl.innerHTML = buttons.join("");
    }

    if (pagerEl) {
      pagerEl.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-page]");
        if (!button || button.disabled) return;
        var page = Number(button.getAttribute("data-page"));
        if (!page) return;
        state.page = page;
        render();
        var top = document.querySelector(".blog-list");
        if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    function render() {
      var list = filtered();
      var totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));

      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;

      var start = (state.page - 1) * PAGE_SIZE;
      var visible = list.slice(start, start + PAGE_SIZE);

      grid.innerHTML = visible.map(card).join("");

      if (emptyEl) {
        emptyEl.hidden = list.length > 0;
        if (emptyText && list.length === 0) {
          emptyText.textContent =
            state.query || state.category !== "All"
              ? "No posts match that filter."
              : "No posts yet — add an HTML file to blog/ and rebuild.";
        }
      }

      pager(totalPages);
      syncUrl();
    }

    render();
  }

  /* ── boot ────────────────────────────────────────────────────── */

  function boot(data) {
    initReadTime();
    initIndex(data);
  }

  if (window.__BLOG_POSTS__) {
    boot(window.__BLOG_POSTS__);
    return;
  }

  if (!document.getElementById("blog-grid")) {
    initReadTime();
    return;
  }

  // posts.js missing or stale: fall back to the JSON index.
  fetch("blog/posts.json", { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(boot)
    .catch(function () {
      boot(null);
    });
})();
