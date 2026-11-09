(function () {
  var YEARS_BACK = 4; // window covers 5 years total, inclusive of current year
  var now = new Date();
  var windowEnd = now.getFullYear();
  var windowStart = windowEnd - YEARS_BACK;

  function parseYearRange(text) {
    var m = text.match(/(\d{4})\s*(?:[–—-]\s*(\d{4}|onwards?))?/i);
    if (!m) return null;
    var start = parseInt(m[1], 10);
    var end = start;
    if (m[2]) {
      end = /onward/i.test(m[2]) ? windowEnd : parseInt(m[2], 10);
    }
    return { start: start, end: end };
  }

  function overlapsWindow(range) {
    return range && range.start <= windowEnd && range.end >= windowStart;
  }

  function countPeopleInWindow(doc, labels) {
    var total = 0;
    var seen = new Set();
    doc.querySelectorAll("h3").forEach(function (h3) {
      if (labels.indexOf(h3.textContent.trim()) === -1) return;
      var ul = h3.nextElementSibling;
      if (!ul) return;
      ul.querySelectorAll(".people-item .years").forEach(function (el) {
        var range = parseYearRange(el.textContent);
        if (overlapsWindow(range)) {
          var key = el.parentElement.textContent.trim();
          if (!seen.has(key)) {
            seen.add(key);
            total++;
          }
        }
      });
    });
    return total;
  }

  function countPublicationsInWindow(doc) {
    var total = 0;
    doc.querySelectorAll("h2.pub-year").forEach(function (h2) {
      var id = h2.id;
      if (!/^\d{4}$/.test(id)) return;
      var year = parseInt(id, 10);
      if (year < windowStart || year > windowEnd) return;
      var ul = h2.nextElementSibling;
      if (!ul) return;
      total += ul.querySelectorAll(".pub-item").length;
    });
    return total;
  }

  function setStat(key, value) {
    var el = document.querySelector('[data-stat="' + key + '"]');
    if (el) el.textContent = value;
  }

  var labelEl = document.querySelector("[data-stats-window]");
  if (labelEl) labelEl.textContent = windowStart + "–" + windowEnd;

  Promise.all([
    fetch("Publications.html").then(function (r) { return r.ok ? r.text() : null; }),
    fetch("People.html").then(function (r) { return r.ok ? r.text() : null; })
  ]).then(function (results) {
    var parser = new DOMParser();

    if (results[0]) {
      var pubDoc = parser.parseFromString(results[0], "text/html");
      setStat("publications", countPublicationsInWindow(pubDoc));
    }

    if (results[1]) {
      var peopleDoc = parser.parseFromString(results[1], "text/html");
      setStat("postdocs", countPeopleInWindow(peopleDoc, ["Postdocs"]));
      setStat("phds", countPeopleInWindow(peopleDoc, ["PhD students", "PhDs"]));
      setStat("masters", countPeopleInWindow(peopleDoc, ["Master students"]));
    }

    document.querySelectorAll(".cv-stats").forEach(function (el) {
      el.classList.add("stats-live");
    });
  }).catch(function () {
    /* fetch failed (e.g. opened as a local file, or offline) — static fallback values stay as-is */
  });
})();
