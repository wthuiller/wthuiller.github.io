(function () {
  // ORCHAMP's own site (orchamp.osug.fr) sends no CORS headers, so a direct
  // cross-origin fetch() from this page is blocked by the browser. We relay
  // through a public "read this URL" service instead. If it ever goes away,
  // this silently falls back to the static number already in Monitoring.html.
  //
  // The plot count is derived from the live gradient count (average ~5
  // plots per gradient) rather than fetched directly: summing the real
  // per-gradient table across all ~60 gradient pages needs that many
  // requests through the free relay, which got rate-limited in testing.
  var RELAYS = [
    function (url) { return "https://r.jina.ai/" + url; },
    function (url) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url); }
  ];
  var BASE = "https://orchamp.osug.fr";

  function setStat(key, value) {
    document.querySelectorAll('[data-orchamp-stat="' + key + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }

  function fetchOnce(url, relayIndex, timeoutMs) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, timeoutMs);
    return fetch(RELAYS[relayIndex](url), controller ? { signal: controller.signal } : undefined)
      .then(function (r) {
        if (timer) clearTimeout(timer);
        if (!r.ok) throw new Error("bad status " + r.status);
        return r.text();
      })
      .then(function (text) {
        if (!text || text.length < 50) throw new Error("empty/short response");
        return text;
      });
  }

  function fetchViaRelay(url, relayIndex) {
    relayIndex = relayIndex || 0;
    if (relayIndex >= RELAYS.length) return Promise.reject(new Error("all relays failed"));
    return fetchOnce(url, relayIndex, 12000).catch(function () {
      return fetchViaRelay(url, relayIndex + 1);
    });
  }

  function extractGradientCount(sitesPageText) {
    var m = sitesPageText.match(/of\s+(\d+)\s+entries/i);
    if (m) return parseInt(m[1], 10);
    var ids = {};
    var re = /\/sites\/(\d+)/g;
    var mm;
    while ((mm = re.exec(sitesPageText))) ids[mm[1]] = true;
    return Object.keys(ids).length;
  }

  var PLOTS_PER_GRADIENT = 5;

  fetchViaRelay(BASE + "/sites")
    .then(function (sitesText) {
      var gradients = extractGradientCount(sitesText);
      setStat("gradients", gradients);
      setStat("plots", "~" + gradients * PLOTS_PER_GRADIENT);
    })
    .catch(function () {
      /* relay unreachable — keep the static numbers already shown */
    });
})();
