(function () {
  "use strict";

  var rows = Array.prototype.slice.call(document.querySelectorAll(".repo-row"));
  var langButtons = Array.prototype.slice.call(document.querySelectorAll(".chip[data-lang]"));
  var visButtons = Array.prototype.slice.call(document.querySelectorAll(".chip[data-vis]"));
  var search = document.getElementById("repo-search");
  var countEl = document.getElementById("repo-count");
  var emptyEl = document.getElementById("repo-empty");
  var reset = document.getElementById("repo-reset");

  if (!rows.length) return;

  /* ───────────── filters ───────────── */

  var state = { lang: "all", vis: "all", q: "" };

  function render() {
    var shown = 0;

    rows.forEach(function (row) {
      var okLang = state.lang === "all" || row.getAttribute("data-lang") === state.lang;
      var okVis = state.vis === "all" || row.getAttribute("data-vis") === state.vis;
      var haystack = (row.textContent || "").toLowerCase();
      var okSearch = !state.q || haystack.indexOf(state.q) !== -1;
      var ok = okLang && okVis && okSearch;

      row.hidden = !ok;
      if (ok) shown += 1;
    });

    if (countEl) {
      countEl.textContent = shown + (shown === 1 ? " repository" : " repositories");
    }
    if (emptyEl) emptyEl.hidden = shown !== 0;
  }

  function bindGroup(buttons, attr, key) {
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        state[key] = button.getAttribute(attr);
        buttons.forEach(function (other) {
          other.setAttribute("aria-pressed", String(other === button));
        });
        render();
      });
    });
  }

  bindGroup(langButtons, "data-lang", "lang");
  bindGroup(visButtons, "data-vis", "vis");

  if (search) {
    search.addEventListener("input", function () {
      state.q = search.value.trim().toLowerCase();
      render();
    });
  }

  if (reset) {
    reset.addEventListener("click", function () {
      state.lang = "all";
      state.vis = "all";
      state.q = "";
      if (search) search.value = "";

      langButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.getAttribute("data-lang") === "all"));
      });
      visButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.getAttribute("data-vis") === "all"));
      });

      render();
      if (search) search.focus();
    });
  }

  render();

  /* ───────────── markdown → html ───────────── */

  var REPO_DATA = window.REPO_READMES || {};
  var REPO_ROOT = "https://github.com/walidmoustafa2077/";

  function escapeHtml(value) {
    return String(value)
      .replace(/&(?!(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);)/gi, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function tagAttr(tag, name) {
    var match = tag.match(new RegExp(name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"));
    return match ? (match[1] || match[2] || match[3] || "") : "";
  }

  function absoluteUrl(raw, repo, branch, isImage) {
    var url = String(raw || "").trim();
    if (!url) return "";
    if (/^(?:https?:|mailto:|tel:|#)/i.test(url)) return url;
    if (/^data:image\//i.test(url) && isImage) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return "#";
    var path = url.replace(/^\.\//, "").replace(/^\/+/, "");
    var base = REPO_ROOT + encodeURIComponent(repo) + (isImage ? "/raw/" : "/blob/") + (branch || "main") + "/";
    try {
      return new URL(path, base).href;
    } catch (err) {
      return base + path;
    }
  }

  function preprocessLine(line) {
    if (line.indexOf("<") === -1) return line;

    line = line.replace(/<br\s*\/?>/gi, "\n");

    line = line.replace(/<img\b[^>]*>/gi, function (tag) {
      var src = tagAttr(tag, "src");
      var alt = tagAttr(tag, "alt");
      return src ? "![" + alt + "](" + src + ")" : "";
    });

    line = line.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, function (tag, inner) {
      var href = tagAttr(tag, "href");
      var label = inner.replace(/<[^>]*>/g, "").trim();
      return href ? "[" + label + "](" + href + ")" : label;
    });

    line = line.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
    line = line.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
    line = line.replace(/<c(?:ode)?\b[^>]*>([\s\S]*?)<\/c(?:ode)?>/gi, "`$1`");
    line = line.replace(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi, function (tag, inner) {
      return "### " + inner.replace(/<[^>]*>/g, "").trim();
    });

    line = line.replace(
      /<\/?(?:div|p|center|details|picture|source|h[1-6]|table|thead|tbody|tfoot|tr|td|th|ul|ol|li|span|font|b|strong|i|em|u|small|sup|sub|kbd|section|article|header|footer)\b[^>]*>/gi,
      ""
    );

    return line;
  }

  function inline(text, repo, branch) {
    var stash = [];

    text = text.replace(/`([^`\n]+)`/g, function (all, code) {
      stash.push(escapeHtml(code));
      return "\u0002" + (stash.length - 1) + "\u0002";
    });

    text = escapeHtml(text);

    text = text.replace(/!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g, function (all, alt, src) {
      var url = absoluteUrl(src, repo, branch, true);
      if (!url) return "";
      return '<img src="' + url + '" alt="' + alt + '" loading="lazy">';
    });

    text = text.replace(/\[([^\]]+)\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g, function (all, label, href) {
      var url = absoluteUrl(href, repo, branch, false);
      if (!url) return label;
      if (url.charAt(0) === "#") return '<a href="' + url + '">' + label + "</a>";
      return '<a href="' + url + '" target="_blank" rel="noopener">' + label + "</a>";
    });

    text = text.replace(/\*\*([\s\S]*?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/__([\s\S]*?)__/g, "<strong>$1</strong>");
    text = text.replace(/~~([\s\S]*?)~~/g, "<del>$1</del>");
    text = text.replace(/(^|[^\w*])\*([^*\n]+)\*(?![\w*])/g, "$1<em>$2</em>");

    text = text.replace(/\u0002(\d+)\u0002/g, function (all, index) {
      return "<code>" + stash[+index] + "</code>";
    });

    return text;
  }

  function isListLine(line) {
    return /^\s*(?:[-*+]|\d+[.)])\s+/.test(line);
  }

  function isTableSep(line) {
    if (line.indexOf("|") === -1 || line.indexOf("-") === -1) return false;
    return /^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/.test(line);
  }

  function tableCells(line) {
    var row = line.trim();
    if (row.charAt(0) === "|") row = row.slice(1);
    if (row.charAt(row.length - 1) === "|") row = row.slice(0, -1);
    return row.split("|").map(function (cell) {
      return cell.trim();
    });
  }

  function renderTable(lines, index, repo, branch, out) {
    var header = tableCells(lines[index]);
    var aligns = tableCells(lines[index + 1]).map(function (cell) {
      var left = cell.charAt(0) === ":";
      var right = cell.charAt(cell.length - 1) === ":";
      if (left && right) return "is-center";
      if (right) return "is-right";
      return "";
    });

    var html = '<div class="readme-table"><table><thead><tr>';
    header.forEach(function (cell, column) {
      html += '<th class="' + (aligns[column] || "") + '">' + inline(cell, repo, branch) + "</th>";
    });
    html += "</tr></thead><tbody>";

    var i = index + 2;
    while (i < lines.length) {
      var line = preprocessLine(lines[i]);
      if (!line.trim() || line.indexOf("|") === -1) break;
      html += "<tr>";
      tableCells(line).forEach(function (cell, column) {
        html += '<td class="' + (aligns[column] || "") + '">' + inline(cell, repo, branch) + "</td>";
      });
      html += "</tr>";
      i += 1;
    }

    html += "</tbody></table></div>";
    out.push(html);
    return i;
  }

  function renderMarkdown(source, repo, branch) {
    var lines = String(source || "")
      .replace(/\r\n?/g, "\n")
      .replace(/\t/g, "    ")
      .split("\n");
    var out = [];
    var droppedTitle = false;
    var i = 0;

    while (i < lines.length) {
      var line = preprocessLine(lines[i]);
      var trimmed = line.trim();

      if (!trimmed) {
        i += 1;
        continue;
      }

      var fence = trimmed.match(/^(`{3,}|~{3,})\s*([\w.+#-]*)\s*$/);
      if (fence) {
        var marker = fence[1].charAt(0);
        var lang = fence[2].toLowerCase().replace(/[^a-z0-9+#.-]/g, "");
        var code = [];
        i += 1;
        while (i < lines.length) {
          var closing = lines[i].trim();
          var closingPattern = marker === "`" ? /^`{3,}$/ : /^~{3,}$/;
          if (closingPattern.test(closing)) break;
          code.push(lines[i]);
          i += 1;
        }
        if (i < lines.length) i += 1;
        out.push(
          '<pre class="readme-pre"' +
            (lang ? ' data-lang="' + lang + '"' : "") +
            "><code>" +
            escapeHtml(code.join("\n")) +
            "</code></pre>"
        );
        continue;
      }

      var heading = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (heading) {
        var level = heading[1].length;
        if (level === 1 && !droppedTitle) {
          droppedTitle = true;
          i += 1;
          continue;
        }
        out.push("<h" + level + ">" + inline(heading[2], repo, branch) + "</h" + level + ">");
        i += 1;
        continue;
      }

      if (/^\s{0,3}(?:(\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(line)) {
        out.push("<hr>");
        i += 1;
        continue;
      }

      if (line.indexOf("|") !== -1 && i + 1 < lines.length && isTableSep(preprocessLine(lines[i + 1]))) {
        i = renderTable(lines, i, repo, branch, out);
        continue;
      }

      if (/^\s{0,3}>/.test(line)) {
        var quote = [];
        while (i < lines.length) {
          var quoted = preprocessLine(lines[i]);
          if (!/^\s{0,3}>/.test(quoted)) break;
          quote.push(quoted.replace(/^\s{0,3}>\s?/, ""));
          i += 1;
        }
        var alert = quote.length ? quote[0].trim().match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i) : null;
        if (alert) {
          var kind = alert[1].toLowerCase();
          quote.shift();
          out.push(
            '<blockquote class="readme-alert is-' +
              kind +
              '"><p class="readme-alert-title">' +
              alert[1].charAt(0) +
              alert[1].slice(1).toLowerCase() +
              "</p>" +
              renderMarkdown(quote.join("\n"), repo, branch) +
              "</blockquote>"
          );
        } else {
          out.push("<blockquote>" + renderMarkdown(quote.join("\n"), repo, branch) + "</blockquote>");
        }
        continue;
      }

      if (isListLine(line)) {
        var items = [];
        while (i < lines.length) {
          var listLine = preprocessLine(lines[i]);
          if (!listLine.trim()) {
            if (i + 1 < lines.length && isListLine(preprocessLine(lines[i + 1]))) {
              i += 1;
              continue;
            }
            break;
          }
          var item = listLine.match(/^(\s*)([-*+]|\d+[.)])\s+([\s\S]*)$/);
          if (!item) break;
          var indent = item[1].length;
          var content = item[3];
          i += 1;
          while (i < lines.length) {
            var continuation = preprocessLine(lines[i]);
            if (!continuation.trim() || isListLine(continuation) || !/^\s{2,}/.test(continuation)) break;
            content += " " + continuation.trim();
            i += 1;
          }
          items.push({ ordered: /^\d/.test(item[2]), sub: indent >= 2, content: content });
        }

        var listHtml = "";
        var orderedGroup = null;
        items.forEach(function (entry) {
          if (entry.ordered !== orderedGroup) {
            if (orderedGroup !== null) listHtml += orderedGroup ? "</ol>" : "</ul>";
            orderedGroup = entry.ordered;
            listHtml += orderedGroup ? "<ol>" : "<ul>";
          }
          var task = entry.content.match(/^\[([ xX])\]\s+([\s\S]*)$/);
          var body;
          if (task) {
            var checked = task[1].toLowerCase() === "x";
            body =
              '<span class="readme-task"' +
              (checked ? ' data-done="true"' : "") +
              ">" +
              (checked ? "☑" : "☐") +
              "</span> " +
              inline(task[2], repo, branch);
          } else {
            body = inline(entry.content, repo, branch);
          }
          listHtml += "<li" + (entry.sub ? ' class="is-sub"' : "") + ">" + body + "</li>";
        });
        if (orderedGroup !== null) listHtml += orderedGroup ? "</ol>" : "</ul>";
        out.push(listHtml);
        continue;
      }

      var paragraph = [trimmed];
      i += 1;
      while (i < lines.length) {
        var next = preprocessLine(lines[i]);
        if (!next.trim()) break;
        if (
          /^\s{0,3}(?:#{1,6})\s+/.test(next) ||
          /^(?:`{3,}|~{3,})/.test(next.trim()) ||
          isListLine(next) ||
          /^\s{0,3}>/.test(next) ||
          /^\s{0,3}(?:(\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(next) ||
          (next.indexOf("|") !== -1 && i + 1 < lines.length && isTableSep(preprocessLine(lines[i + 1])))
        ) {
          break;
        }
        paragraph.push(next.trim());
        i += 1;
      }

      var parts = paragraph.map(function (part) {
        var hardBreak = / {2,}$/.test(part);
        return inline(part.trim(), repo, branch) + (hardBreak ? "<br>" : "");
      });
      out.push("<p>" + parts.join(" ") + "</p>");
    }

    return out.join("\n");
  }

  /* ───────────── README modal ───────────── */

  var modal = document.getElementById("repo-modal");
  var modalBody = document.getElementById("repo-modal-body");
  var modalScroll = modal ? modal.querySelector(".repo-modal-scroll") : null;
  var modalName = document.getElementById("repo-modal-name");
  var modalKicker = document.getElementById("repo-modal-kicker");
  var modalDesc = document.getElementById("repo-modal-desc");
  var modalLang = document.getElementById("repo-modal-lang");
  var modalDate = document.getElementById("repo-modal-date");
  var modalStatus = document.getElementById("repo-modal-status");
  var modalNote = document.getElementById("repo-modal-note");
  var modalLink = document.getElementById("repo-modal-link");
  var modalAsk = document.getElementById("repo-modal-ask");
  var lastFocus = null;

  function rowText(row, selector, fallback) {
    var element = row.querySelector(selector);
    return element && element.textContent ? element.textContent.trim() : fallback;
  }

  function emptyReadme(isPrivate, hasReadme) {
    return (
      '<div class="readme-empty">' +
      '<p class="readme-empty-title">' +
      (hasReadme ? "This README is just a title." : "No README in this repository yet.") +
      "</p>" +
      "<p>" +
      (hasReadme
        ? "Open the repository on GitHub to see the code."
        : isPrivate
        ? "The code is private — ask for a walkthrough and I will take you through it."
        : "The repository is public; the code is the documentation for now.") +
      "</p></div>"
    );
  }

  function openModal(row) {
    if (!modal || !modalBody) return;

    var name = row.getAttribute("data-repo") || rowText(row, ".repo-name", "Repository");
    var isPrivate = row.getAttribute("data-vis") === "private";
    var isArchived = !!row.querySelector(".repo-tag.is-archived");
    var url = row.tagName === "A" && row.getAttribute("href")
      ? row.getAttribute("href")
      : REPO_ROOT + name;
    var entry = REPO_DATA[name];
    var status = isArchived ? "Archived" : isPrivate ? "Private" : "Public";

    if (modalKicker) {
      modalKicker.textContent =
        "Repository " + rowText(row, ".repo-idx", "") + " — " + status;
    }
    if (modalName) modalName.textContent = name;
    if (modalDesc) modalDesc.textContent = rowText(row, ".repo-desc", "");
    if (modalLang) modalLang.textContent = rowText(row, ".repo-lang", "—");
    if (modalDate) modalDate.textContent = rowText(row, ".repo-date", "—");
    if (modalStatus) modalStatus.textContent = status + (isPrivate ? " · walkthrough on request" : "");

    if (modalNote) {
      modalNote.textContent = isPrivate
        ? "Private repository — opening it on GitHub requires access."
        : isArchived
        ? "Archived repository — kept here for the record."
        : "";
    }

    if (modalLink) {
      modalLink.href = url;
      modalLink.setAttribute("aria-label", "View the repository " + name + " on GitHub");
    }

    if (modalAsk) {
      modalAsk.hidden = !isPrivate;
      modalAsk.href =
        "mailto:walidmostafa2077@gmail.com?subject=" +
        encodeURIComponent("Walkthrough request — " + name);
    }

    var rendered = entry && entry.readme ? renderMarkdown(entry.readme, name, entry.branch) : "";
    modalBody.innerHTML = rendered.trim()
      ? rendered
      : emptyReadme(isPrivate, !!(entry && entry.readme));

    if (modalScroll) modalScroll.scrollTop = 0;
    lastFocus = document.activeElement;

    if (typeof modal.showModal === "function") {
      if (!modal.open) modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }

    document.body.classList.add("has-modal");

    var closeButton = modal.querySelector(".modal-close");
    if (closeButton) closeButton.focus();
  }

  function closeModal() {
    if (!modal) return;
    if (typeof modal.close === "function" && modal.open) {
      modal.close();
    } else {
      modal.removeAttribute("open");
    }
    document.body.classList.remove("has-modal");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  if (modal && modalBody) {
    Array.prototype.forEach.call(modal.querySelectorAll("[data-close]"), function (button) {
      button.addEventListener("click", closeModal);
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal();
    });

    modal.addEventListener("close", function () {
      document.body.classList.remove("has-modal");
    });

    rows.forEach(function (row) {
      row.addEventListener("click", function (event) {
        var ask = event.target.closest ? event.target.closest(".repo-ask") : null;
        if (ask) return;
        if (row.tagName === "A") event.preventDefault();
        openModal(row);
      });

      if (row.tagName !== "A") {
        row.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            openModal(row);
          }
        });
      }
    });
  }
})();
