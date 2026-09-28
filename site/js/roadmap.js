/* Proven on hardware, upstream enablement and roadmap, rendered from
 * data/roadmap.json (schema rds-roadmap/v2). That feed is generated from one
 * typed source, docs/rds/roadmap.json, by tools/rds/build-roadmap-feed.py; what
 * that generator checked is in the feed's own "checks" list, and the page shows
 * that list rather than describing it. This file only lays the feed out: every
 * label, class name and blurb comes from the feed. Status, case ids, run times
 * and links only; the feed carries no figures by design. A reference into a
 * private repository arrives with no URL and is shown as text. */
(function () {
  "use strict";

  var STATUS_CLASS = { "proven": "st-proven", "partly proven": "st-partly", "not yet": "st-notyet" };
  var PENDING = { "running": "in progress", "judging": "results being judged" };
  // A verdict badge is drawn only from the feed's verdict, which the generator
  // checked against the case record; a label never carries the word itself.
  var VERDICT = { "pass": "passed", "fail": "failed", "inconclusive": "inconclusive", "aborted": "aborted" };
  var PRIVATE_TITLE = "A private repository: public readers cannot open it";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function when(isoStr) {
    // 2026-09-23T02:29:40Z -> 2026-09-23 02:29Z. Run times are UTC, as the run ids are.
    return isoStr ? isoStr.slice(0, 10) + " " + isoStr.slice(11, 16) + "Z" : "";
  }

  // Public references are links. Private ones are text, grouped by repository:
  // "tracked privately as mujina-bzm2-dev#59, #55; rdsmujina-env#8".
  function refList(refs) {
    refs = (refs || []).filter(Boolean);
    var pub = refs.filter(function (r) { return r.url; }).map(function (r) {
      return '<a class="rm-ref" href="' + esc(r.url) + '" rel="noopener noreferrer">' + esc(r.ref) + "</a>";
    });
    var order = [], byRepo = {};
    refs.filter(function (r) { return !r.url; }).forEach(function (r) {
      if (!byRepo[r.repo]) { byRepo[r.repo] = []; order.push(r.repo); }
      byRepo[r.repo].push(r);
    });
    var priv = order.map(function (repo) {
      return byRepo[repo].map(function (r, i) {
        return (r.pr ? "PR " : "") + (i === 0 ? repo : "") + "#" + r.num;
      }).join(", ");
    }).join("; ");
    if (priv) {
      pub.push('<span class="rm-ref-private" title="' + PRIVATE_TITLE + '">tracked privately as ' + esc(priv) + "</span>");
    }
    return pub.join("; ");
  }

  function chip(status) {
    return '<span class="rm-status ' + (STATUS_CLASS[status] || "") + '">' + esc(status) + "</span>";
  }

  function tierTag(t) {
    if (t.inherited) return ' <span class="rm-home">already upstream</span>';
    return t.upstream ? "" : ' <span class="rm-home">stays here</span>';
  }

  function uniqueCases(ev) {
    var seen = {}, out = [];
    ev.forEach(function (e) { if (!seen[e.case]) { seen[e.case] = 1; out.push(e.case); } });
    return out;
  }

  function evidenceList(ev) {
    return '<ul class="rm-runs">' + ev.map(function (e) {
      return "<li><code>" + esc(e.case) + "</code> <time>" + esc(when(e.at)) + "</time> " + esc(e.label) +
        (e.pending ? ' <span class="rm-pending rm-pending-' + esc(e.pending) + '">' + esc(PENDING[e.pending] || e.pending) +
          "</span>" : "") +
        (e.verdict ? ' <span class="rm-verdict rm-verdict-' + esc(e.verdict) + '">' + esc(VERDICT[e.verdict] || e.verdict) +
          "</span>" : "") + "</li>";
    }).join("") + "</ul>";
  }

  // A proven row collapses to its case ids; anything short of proven keeps its
  // runs open, because a gap's evidence is the part a reader needs.
  function evidenceBlock(item) {
    var ev = item.evidence || [];
    if (!ev.length) return '<p class="rm-none">Not yet exercised on hardware.</p>';
    var summary = "Evidence: " + uniqueCases(ev).map(esc).join(", ");
    return "<details" + (item.status === "proven" ? "" : " open") + ' class="rm-evidence"><summary>' +
      summary + "</summary>" + evidenceList(ev) + "</details>";
  }

  function capability(item, roadmapHref) {
    var bits = [];
    if (item.issues && item.issues.length) bits.push("Issues " + refList(item.issues));
    if (item.path && item.path.length) {
      bits.push("Path " + item.path.map(function (id) {
        return '<a href="' + esc(roadmapHref) + "#rm-" + esc(id) + '">' + esc(id) + "</a>";
      }).join(", "));
    }
    if (item.milestone) bits.push('<a href="' + esc(item.milestone) + '">Milestone statement</a>');
    return '<article class="rm-cap" id="cap-' + esc(item.id) + '">' +
      '<div class="rm-cap-head">' + chip(item.status) + "<p>" + esc(item.text) + "</p></div>" +
      evidenceBlock(item) +
      (bits.length ? '<p class="rm-meta">' + bits.join(" &middot; ") + "</p>" : "") +
      "</article>";
  }

  function renderProven(root, feed) {
    var roadmapHref = root.getAttribute("data-roadmap") || "roadmap/";
    // Tiers appear in the order the source lists its rows, so the section opens
    // on the source's first row; feed.tiers stays in stacking order for branches.
    var order = [];
    feed.proven.forEach(function (p) { if (order.indexOf(p.tier) < 0) order.push(p.tier); });
    var tiers = order.map(function (name) {
      return feed.tiers.filter(function (t) { return t.tier === name; })[0] || { tier: name, upstream: false, test: "" };
    });
    root.innerHTML = tiers.map(function (t) {
      var items = feed.proven.filter(function (p) { return p.tier === t.tier; });
      if (!items.length) return "";
      return '<div class="rm-tier" id="tier-' + esc(t.tier) + '"><h3><code>' + esc(t.tier) + "</code>" +
        tierTag(t) + "</h3>" + '<p class="rm-test">' + esc(t.test) + "</p>" +
        items.map(function (p) { return capability(p, roadmapHref); }).join("") + "</div>";
    }).join("");
  }

  function branchName(t) {
    if (t.url) {
      return '<a href="' + esc(t.url) + '" rel="noopener noreferrer"><code>' + esc(t.branch) + "</code></a>";
    }
    return "<code>" + esc(t.branch) + '</code> <span class="rm-ref-private" title="' + PRIVATE_TITLE +
      '">tracked privately in ' + esc(t.repo) + "</span>";
  }

  function treeNote(tree) {
    if (!tree || !tree.built_from) return "";
    var newer = tree.newer || [];
    var text = "The branches were built from the lab tree at <code>" + esc(tree.built_from) + "</code>. ";
    if (!newer.length) return '<p class="rm-meta">' + text + "The lab tree has no Mujina change since.</p>";
    return '<p class="rm-note">' + text + "Since then the lab tree has gained " + newer.length + " Mujina commit" +
      (newer.length === 1 ? "" : "s") + " that these branches do not carry yet:</p>" +
      '<ul class="rm-runs">' + newer.map(function (c) {
        return "<li><code>" + esc(c.head) + "</code> " + esc(c.subject) + "</li>";
      }).join("") + "</ul>";
  }

  function renderEnablement(root, feed) {
    var rows = feed.tiers.map(function (t) {
      if (!t.upstream) {
        return '<li class="rm-branch"><div class="rm-branch-head"><code>' + esc(t.tier) + "</code>" +
          tierTag(t) + "</div><p>" + esc(t.test) + "</p></li>";
      }
      return '<li class="rm-branch"><div class="rm-branch-head">' + branchName(t) +
        ' <span class="rm-sha">' + esc(t.head) + " &middot; " + esc(t.date) + "</span></div>" +
        "<p>" + esc(t.test) + "</p>" +
        '<p class="rm-subject">' + esc(t.subject) + "</p>" +
        (t.stacked_on ? '<p class="rm-meta">Stacked on <code>' + esc(t.stacked_on) + "</code></p>" : "") +
        (t.note ? '<p class="rm-note">' + esc(t.note) + "</p>" : "") +
        '<p class="rm-meta"><a href="#tier-' + esc(t.tier) + '">What this tier has proven on hardware</a></p></li>';
    });
    root.innerHTML = '<ul class="rm-branches">' + rows.join("") + "</ul>" + treeNote(feed.tree);
  }

  function renderRoadmap(root, feed) {
    var home = root.getAttribute("data-home") || "../";
    var byId = {};
    feed.proven.forEach(function (p) { byId[p.id] = p; });
    root.innerHTML = feed.classes.map(function (cls) {
      var items = feed.roadmap.filter(function (r) { return r["class"] === cls.id; });
      if (!items.length) return "";
      return '<div class="rm-class rm-class-' + esc(cls.id) + '"><h2>' + esc(cls.label) + "</h2>" +
        '<p class="rm-test">' + esc(cls.blurb) + "</p>" +
        items.map(function (r) {
          var bits = [];
          bits.push(r.epic ? "Epic " + refList([r.epic]) : "No epic");
          if (r.issues && r.issues.length) bits.push("Issues " + refList(r.issues));
          else bits.push("No issue of its own yet");
          if (r.raised_in) bits.push("Raised in a review, " + refList([r.raised_in]));
          var closes = (r.closes || []).map(function (id) {
            var p = byId[id];
            return '<a href="' + esc(home) + "#cap-" + esc(id) + '">' + esc(id) + "</a>" + (p ? " " + chip(p.status) : "");
          });
          var deps = (r.depends_on || []).map(function (id) {
            return '<a href="#rm-' + esc(id) + '">' + esc(id) + "</a>";
          });
          return '<article class="rm-item" id="rm-' + esc(r.id) + '"><p class="rm-item-text">' + esc(r.text) + "</p>" +
            '<p class="rm-meta">' + bits.join(" &middot; ") + "</p>" +
            (deps.length ? '<p class="rm-meta">Depends on ' + deps.join(", ") + "</p>" : "") +
            (closes.length ? '<p class="rm-meta">Closes ' + closes.join(", ") + "</p>" : "") +
            (r.planned && r.planned.length ? '<p class="rm-meta">Next on hardware, not yet run: ' +
              r.planned.map(function (c) { return "<code>" + esc(c) + "</code>"; }).join(", ") + "</p>" : "") +
            (r.evidence && r.evidence.length ? evidenceList(r.evidence) : "") + "</article>";
        }).join("") + "</div>";
    }).join("");
  }

  function renderChecks(el, feed) {
    var unasked = [];
    if (!feed.visibility_checked) unasked.push("which repositories are private");
    if (!feed.trackers_checked) unasked.push("that every cited issue exists and every epic is one");
    el.innerHTML = '<ul class="rm-checks">' + (feed.checks || []).map(function (c) {
      return "<li>" + esc(c) + "</li>";
    }).join("") + "</ul>" +
      (unasked.length ? '<p class="rm-meta">Not checked with GitHub for this build: ' + esc(unasked.join("; ")) + ".</p>" : "");
  }

  function renderMeta(el, feed) {
    var age = (Date.now() - Date.parse(feed.generated_at)) / 1000;
    var stale = isFinite(age) && age > (feed.stale_after_s || 604800);
    el.innerHTML = "Generated " + esc(when(feed.generated_at)) +
      (feed.git_commit ? " from commit <code>" + esc(feed.git_commit) + "</code>" : " from source not yet pushed as a commit") +
      ": " + esc(feed.source) + "." +
      " A reference tracked privately is in a repository only the project team can open, so it is shown as text, not a link." +
      (stale ? ' <strong class="rm-stale">This feed is older than its freshness window; the page may be behind the records.</strong>' : "");
  }

  function fail(nodes, err) {
    nodes.forEach(function (n) {
      n.innerHTML = '<p class="rm-none">Could not load the roadmap feed (' + esc(err && err.message) + ").</p>";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-roadmap-view]"));
    if (!nodes.length) return;
    var dataRoot = (nodes[0].getAttribute("data-data-root") || "data").replace(/\/$/, "");
    fetch(dataRoot + "/roadmap.json?_=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (feed) {
        nodes.forEach(function (n) {
          var v = n.getAttribute("data-roadmap-view");
          if (v === "headline") n.innerHTML = "<p>" + esc(feed.headline) + "</p>";
          else if (v === "proven") renderProven(n, feed);
          else if (v === "enablement") renderEnablement(n, feed);
          else if (v === "roadmap") renderRoadmap(n, feed);
          else if (v === "checks") renderChecks(n, feed);
          else if (v === "meta") renderMeta(n, feed);
        });
      })
      .catch(function (err) { fail(nodes, err); });
  });
})();
