(function () {
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
    } catch (e) {
      return "";
    }
  }

  async function loadCard(card) {
    var repo = card.getAttribute("data-gh-repo");
    if (!repo) return;
    try {
      var repoRes = await fetch("https://api.github.com/repos/" + repo);
      if (!repoRes.ok) throw new Error("repo fetch failed");
      var repoData = await repoRes.json();

      var stars = card.querySelector("[data-gh-stars]");
      if (stars) stars.textContent = repoData.stargazers_count.toLocaleString();

      var updated = card.querySelector("[data-gh-updated]");
      if (updated) updated.textContent = fmtDate(repoData.pushed_at);

      var issues = card.querySelector("[data-gh-issues]");
      if (issues) issues.textContent = repoData.open_issues_count.toLocaleString();

      try {
        var relRes = await fetch("https://api.github.com/repos/" + repo + "/releases/latest");
        if (relRes.ok) {
          var rel = await relRes.json();
          var release = card.querySelector("[data-gh-release]");
          if (release) {
            release.textContent = rel.tag_name;
            release.href = rel.html_url;
          }
          var relDate = card.querySelector("[data-gh-release-date]");
          if (relDate) relDate.textContent = fmtDate(rel.published_at);
        }
      } catch (e) {
        /* no releases published — leave release stat blank */
      }
    } catch (e) {
      card.classList.add("gh-stats-error");
    }
  }

  document.querySelectorAll("[data-gh-repo]").forEach(loadCard);
})();
