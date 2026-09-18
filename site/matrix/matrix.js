/* Validation matrix — status + timestamps only. No measurements. */
(function () {
  "use strict";

  var S = window.BringupStatus || window.N5Status;
  var root = document.getElementById("matrix-root");
  var metaEl = document.getElementById("matrix-meta");
  var openKey = null;
  var openStageId = null; // null until first paint; then stage id or falsey
  var stageOpenTouched = false; // user toggled a stage

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function labelOf(cell) {
    if (cell.layout) return cell.layout;
    if (cell.model) return cell.model;
    if (Array.isArray(cell.layouts) && cell.layouts.length) {
      return cell.layouts.join(" / ");
    }
    return "case";
  }

  function cellTitle(cell) {
    var bits = [];
    if (cell.n != null) bits.push("#" + cell.n);
    bits.push(labelOf(cell));
    if (cell.mode && cell.mode !== "full") bits.push(cell.mode);
    if (cell.detail) bits.push(cell.detail);
    return bits.join(" · ");
  }

  function canExpand(cell) {
    var st = S.statusClass(cell.status);
    return st === "running" || st === "passed" || S.caseList(cell).length > 0;
  }

  function renderLegend() {
    var items = [
      ["pending", "pending"],
      ["running", "running"],
      ["passed", "passed"],
      ["failed", "failed"],
      ["blocked", "blocked / skipped"],
    ];
    return (
      '<ul class="status-legend" aria-label="Status color legend">' +
      items
        .map(function (it) {
          return (
            '<li><span class="swatch st-' +
            it[0] +
            '" aria-hidden="true"></span>' +
            esc(it[1]) +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  var caseIndexPromise = null;
  function loadCaseIndex() {
    if (caseIndexPromise) return caseIndexPromise;
    caseIndexPromise = fetch("../data/test-cases-index.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) return { cases: {} };
        return res.json();
      })
      .catch(function () {
        return { cases: {} };
      });
    return caseIndexPromise;
  }

  function lookupCaseDoc(index, id) {
    if (!index) return null;
    var cases = index.cases || index;
    if (cases && typeof cases === "object" && cases[id]) return cases[id];
    if (Array.isArray(cases)) {
      for (var i = 0; i < cases.length; i++) {
        var c = cases[i];
        if (c && (c.id === id || c.tcid === id)) return c;
      }
    }
    return null;
  }

  function fieldText(doc, keys) {
    if (!doc) return "";
    for (var i = 0; i < keys.length; i++) {
      var v = doc[keys[i]];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (Array.isArray(v) && v.length) return v.join("\n");
    }
    return "";
  }

  function caseMark(st) {
    if (st === "passed") return { mark: "✓", label: "passed" };
    if (st === "failed") return { mark: "✗", label: "failed" };
    if (st === "running") return { mark: "●", label: "running" };
    if (st === "blocked" || st === "skipped") return { mark: "–", label: st };
    return { mark: "·", label: "pending" };
  }

  function caseWhen(st, started, finished) {
    if (st === "pending") return "—";
    if (!started) {
      if (st === "running") return "in progress";
      return "—";
    }
    // Clock-only on case rows — full date stays on the cell header.
    var local = (S.formatLocalTime || S.formatLocal)(started);
    if (finished) {
      var dur = S.formatDuration(started, finished);
      return dur ? local + " (" + dur + ")" : local;
    }
    if (st === "running") return local + " (…)";
    return local;
  }

  function renderCases(cell) {
    var cases = S.caseList(cell);
    if (!cases.length) {
      return '<p class="case-empty">No execution records in this feed yet.</p>';
    }
    var layout = labelOf(cell);
    return (
      '<div class="cell-detail-toolbar">' +
      '<button type="button" class="case-doc-open" data-case-id="' +
      esc(layout) +
      '">Case description · ' +
      esc(layout) +
      "</button>" +
      "</div>" +
      '<ul class="case-list">' +
      cases
        .map(function (c) {
          var st = S.statusClass(c.status);
          var started = S.caseStarted(c);
          var finished = S.caseFinished(c);
          var id = S.caseId(c);
          var tcid = c.tcid || layout;
          var stamp = c.stamp || "";
          var mk = caseMark(st);
          var when = caseWhen(st, started, finished);
          return (
            '<li class="case-row st-' +
            st +
            '">' +
            '<button type="button" class="run-open" data-tcid="' +
            esc(tcid) +
            '" data-run-id="' +
            esc(id) +
            '" data-stamp="' +
            esc(stamp) +
            '" title="' +
            esc("Execution " + id + " · " + mk.label) +
            '">' +
            '<span class="case-mark" aria-label="' +
            esc(mk.label) +
            '">' +
            esc(mk.mark) +
            "</span>" +
            '<span class="case-id" title="' +
            esc(id) +
            '">' +
            esc(id) +
            "</span>" +
            '<span class="case-when">' +
            esc(when) +
            "</span>" +
            "</button>" +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }


  function caseCounts(cell) {
    var cases = S.caseList(cell);
    var total = cases.length;
    var passed = 0;
    var failed = 0;
    cases.forEach(function (c) {
      var st = S.statusClass(c.status);
      if (st === "passed") passed++;
      else if (st === "failed") failed++;
    });
    return { total: total, passed: passed, failed: failed };
  }

  function cellStatusHtml(cell, st) {
    var counts = caseCounts(cell);
    var top = st.toUpperCase();
    var mid = "";
    var dur = "";
    if (counts.total > 0) {
      if (st === "passed") mid = counts.passed + "/" + counts.total;
      else if (st === "failed")
        mid = counts.failed + "✗ · " + counts.passed + "/" + counts.total;
      else if (st === "running" || st === "pending")
        mid = counts.passed + "/" + counts.total;
    }
    if ((st === "passed" || st === "failed") && cell.started_at && cell.finished_at) {
      dur = S.formatDuration(cell.started_at, cell.finished_at) || "";
    } else if (st === "running" && cell.started_at) {
      dur = S.formatDuration(cell.started_at, new Date().toISOString()) || "";
    }
    var html = '<span class="cell-status-label">' + esc(top) + "</span>";
    if (mid) html += '<span class="cell-status-count">' + esc(mid) + "</span>";
    if (dur) html += '<span class="cell-status-dur">' + esc(dur) + "</span>";
    return html;
  }

  function renderCell(stage, cell) {
    var key = S.cellKey(stage, cell);
    var st = S.statusClass(cell.status);
    var expandable = canExpand(cell);
    var open = openKey === key;
    var layout = labelOf(cell);
    var times = [];
    if (cell.started_at) times.push("started " + S.formatLocal(cell.started_at));
    if (cell.finished_at) {
      var cellDur = cell.started_at
        ? S.formatDuration(cell.started_at, cell.finished_at)
        : "";
      times.push(
        "finished " +
          S.formatLocal(cell.finished_at) +
          (cellDur ? " (" + cellDur + ")" : "")
      );
    }
    var body = "";
    if (open) {
      body =
        '<div class="cell-detail">' +
        (times.length
          ? '<p class="cell-times">' + esc(times.join(" · ")) + "</p>"
          : "") +
        renderCases(cell) +
        "</div>";
    }
    return (
      '<article class="matrix-cell st-' +
      st +
      (open ? " is-open" : "") +
      (expandable ? " is-expandable" : "") +
      '" data-key="' +
      esc(key) +
      '" data-layout="' +
      esc(layout) +
      '">' +
      '<div class="cell-head">' +
      '<button type="button" class="case-doc-open cell-name" data-case-id="' +
      esc(layout) +
      '" title="Case description">' +
      esc(layout) +
      "</button>" +
      '<button type="button" class="cell-toggle" ' +
      (expandable ? "" : "disabled ") +
      'aria-expanded="' +
      (open ? "true" : "false") +
      '" title="' +
      esc(expandable ? "Show executions" : "No executions yet") +
      '">' +
      '<span class="cell-n">#' +
      esc(cell.n != null ? cell.n : "–") +
      "</span>" +
      '<span class="cell-meta">' +
      esc(
        [cell.suite, cell.mode && cell.mode !== "full" ? cell.mode : "", cell.detail]
          .filter(Boolean)
          .join(" · ")
      ) +
      "</span>" +
      '<span class="cell-status">' +
      cellStatusHtml(cell, st) +
      "</span>" +
      "</button>" +
      "</div>" +
      body +
      "</article>"
    );
  }


  function stageIdOf(stage) {
    return stage && stage.id != null ? stage.id : "unknown";
  }

  function stageRollup(stage) {
    var cells = Array.isArray(stage.cells) ? stage.cells : [];
    var cellTotal = cells.length;
    var cellPassed = 0;
    var cellFailed = 0;
    var cellRunning = 0;
    var cellPending = 0;
    var caseTotal = 0;
    var casePassed = 0;
    var caseFailed = 0;
    var caseRunning = 0;
    var starts = [];
    var ends = [];
    cells.forEach(function (cell) {
      var st = S.statusClass(cell.status);
      if (st === "passed") cellPassed++;
      else if (st === "failed") cellFailed++;
      else if (st === "running") cellRunning++;
      else cellPending++;
      var cc = caseCounts(cell);
      caseTotal += cc.total;
      casePassed += cc.passed;
      caseFailed += cc.failed;
      S.caseList(cell).forEach(function (c) {
        if (S.statusClass(c.status) === "running") caseRunning++;
      });
      if (cell.started_at) starts.push(cell.started_at);
      if (cell.finished_at) ends.push(cell.finished_at);
      S.caseList(cell).forEach(function (c) {
        if (c.started_at) starts.push(c.started_at);
        if (c.finished_at) ends.push(c.finished_at);
      });
    });
    var declared = String(stage.status || "").toLowerCase();
    var st;
    if (declared === "soft_finished" || declared === "passed" || declared === "complete" || declared === "completed") {
      st = "passed";
    } else if (declared === "running" || cellRunning > 0) {
      st = "running";
    } else if (declared === "failed" || cellFailed > 0) {
      st = "failed";
    } else if (declared === "pending" || cellTotal === 0 || (cellPending === cellTotal && cellTotal > 0)) {
      st = "pending";
    } else if (cellPassed === cellTotal && cellTotal > 0) {
      st = "passed";
    } else {
      st = S.statusClass(stage.status || "pending");
    }
    var start = starts.length ? starts.slice().sort()[0] : null;
    var end = ends.length ? ends.slice().sort().slice(-1)[0] : null;
    return {
      st: st,
      cellTotal: cellTotal,
      cellPassed: cellPassed,
      cellFailed: cellFailed,
      cellRunning: cellRunning,
      cellPending: cellPending,
      caseTotal: caseTotal,
      casePassed: casePassed,
      caseFailed: caseFailed,
      caseRunning: caseRunning,
      started_at: start,
      finished_at: end,
    };
  }

  function stageStatusHtml(roll) {
    var top = roll.st.toUpperCase();
    var mid = "";
    var mid2 = "";
    var dur = "";
    if (roll.cellTotal > 0) {
      if (roll.st === "passed") mid = roll.cellPassed + "/" + roll.cellTotal + " cases";
      else if (roll.st === "failed")
        mid = roll.cellFailed + "✗ · " + roll.cellPassed + "/" + roll.cellTotal + " cases";
      else if (roll.st === "running" || roll.st === "pending")
        mid = roll.cellPassed + "/" + roll.cellTotal + " cases";
    } else {
      mid = "0 cases";
    }
    if (roll.caseTotal > 0) {
      if (roll.st === "failed")
        mid2 = roll.caseFailed + "✗ · " + roll.casePassed + "/" + roll.caseTotal + " cases";
      else mid2 = roll.casePassed + "/" + roll.caseTotal + " cases";
    }
    if ((roll.st === "passed" || roll.st === "failed") && roll.started_at && roll.finished_at) {
      dur = S.formatDuration(roll.started_at, roll.finished_at) || "";
    } else if (roll.st === "running" && roll.started_at) {
      dur = S.formatDuration(roll.started_at, new Date().toISOString()) || "";
    }
    var html = '<span class="cell-status-label">' + esc(top) + "</span>";
    if (mid) html += '<span class="cell-status-count">' + esc(mid) + "</span>";
    if (mid2) html += '<span class="cell-status-count">' + esc(mid2) + "</span>";
    if (dur) html += '<span class="cell-status-dur">' + esc(dur) + "</span>";
    return html;
  }

  function pickDefaultOpenStage(status) {
    var norm = S.normalizeStatus(status);
    var running = null;
    var firstWithCells = null;
    (norm.stages || []).forEach(function (st) {
      var roll = stageRollup(st);
      var sid = stageIdOf(st);
      if (!running && roll.st === "running") running = sid;
      if (!firstWithCells && roll.cellTotal > 0) firstWithCells = sid;
    });
    return running != null ? running : firstWithCells;
  }

  function renderStage(stage) {
    var cells = Array.isArray(stage.cells) ? stage.cells : [];
    var sid = stageIdOf(stage);
    var roll = stageRollup(stage);
    var open = String(openStageId) === String(sid);
    var hist =
      stage.status === "soft_finished" || /historical/i.test(stage.name || "");
    var body = "";
    if (open) {
      body =
        '<div class="cell-grid">' +
        (cells.length
          ? cells.map(function (c) {
              return renderCell(stage, c);
            }).join("")
          : '<p class="stage-empty">No cases in this phase yet.</p>') +
        "</div>";
    }
    return (
      '<section class="matrix-stage st-' +
      esc(roll.st) +
      (open ? " is-open" : " is-collapsed") +
      '" id="stage-' +
      esc(sid) +
      '" data-stage-id="' +
      esc(sid) +
      '">' +
      '<button type="button" class="stage-head" aria-expanded="' +
      (open ? "true" : "false") +
      '">' +
      '<div class="stage-head-text">' +
      '<p class="section-label">Phase ' +
      esc(sid) +
      (hist ? " · historical" : "") +
      (open ? "" : " · collapsed") +
      "</p>" +
      "<h2>" +
      esc(stage.name || "Phase " + sid) +
      "</h2>" +
      "</div>" +
      '<span class="stage-status cell-status">' +
      stageStatusHtml(roll) +
      "</span>" +
      "</button>" +
      body +
      "</section>"
    );
  }

  function renderHeader(status) {
    var updated = S.statusUpdatedAt(status);
    var harness = S.harnessCommit(status);
    var git = S.gitCommit(status);
    var sample =
      status._source_file === "campaign-status.sample.json" ||
      status.source === "sample";
    var stale = S.isStale(status);
    var bits = [];
    bits.push(
      '<span>Updated <code>' +
        esc(updated ? S.formatIso(updated) : "—") +
        "</code>" +
        (updated ? " <em>(" + esc(S.formatAge(updated)) + ")</em>" : "") +
        "</span>"
    );
    if (harness) bits.push("<span>Harness <code>" + esc(harness) + "</code></span>");
    if (git) bits.push("<span>Git <code>" + esc(git) + "</code></span>");
    bits.push(
      "<span>Feed <code>" +
        esc(status._source_file || "campaign-status") +
        "</code>" +
        (sample ? " · sample" : "") +
        "</span>"
    );
    if (stale) bits.push('<span class="meta-stale">status older than stale window</span>');
    if (metaEl) {
      metaEl.innerHTML = bits.join("");
    }
  }

  function pickDefaultOpen(status) {
    var norm = S.normalizeStatus(status);
    var running = null;
    var passed = null;
    (norm.stages || []).forEach(function (st) {
      (st.cells || []).forEach(function (c) {
        var key = S.cellKey(st, c);
        var sc = S.statusClass(c.status);
        if (!running && sc === "running") running = key;
        if (!passed && sc === "passed") passed = key;
      });
    });
    return running || passed;
  }


  /** Lightweight markdown → HTML for case-doc fields (public-sanitized). */
  function mdInline(escaped) {
    // input must already be HTML-escaped; transform md markers afterward
    var s = escaped;
    s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    s = s.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return s;
  }

  function mdToHtml(text) {
    if (!text) return "";
    var lines = String(text).replace(/\r\n/g, "\n").split("\n");
    var html = [];
    var i = 0;

    function isBlank(s) {
      return !String(s || "").trim();
    }
    function isFence(s) {
      return /^```/.test(String(s || "").trim());
    }
    function isHeading(s) {
      return /^(#{1,6})\s+\S/.test(String(s || "").trim());
    }
    function isUl(s) {
      return /^[-*+]\s+\S/.test(String(s || "").trim());
    }
    function isOl(s) {
      return /^\d+\.\s+\S/.test(String(s || "").trim());
    }
    function isList(s) {
      return isUl(s) || isOl(s);
    }
    function isCont(s) {
      // indented continuation of a list item / paragraph
      return /^\s{2,}\S/.test(String(s || ""));
    }

    while (i < lines.length) {
      if (isBlank(lines[i])) {
        i++;
        continue;
      }

      // fenced code block
      if (isFence(lines[i])) {
        i++;
        var code = [];
        while (i < lines.length && !isFence(lines[i])) {
          code.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // closing fence
        html.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>");
        continue;
      }

      // AT heading — strip the hashes (they must not appear in the UI)
      var hm = /^(#{1,6})\s+(.+)$/.exec(lines[i].trim());
      if (hm) {
        var level = hm[1].length <= 2 ? 4 : 5;
        html.push(
          "<h" +
            level +
            ' class="doc-md-h">' +
            mdInline(esc(hm[2].trim())) +
            "</h" +
            level +
            ">"
        );
        i++;
        continue;
      }

      // list (with indented continuations merged into the item)
      if (isList(lines[i])) {
        var ordered = isOl(lines[i]);
        var tag = ordered ? "ol" : "ul";
        var items = [];
        while (i < lines.length) {
          if (isBlank(lines[i])) {
            // blank inside list: peek ahead — another item continues the list
            var j = i + 1;
            while (j < lines.length && isBlank(lines[j])) j++;
            if (j < lines.length && isList(lines[j])) {
              i = j;
              continue;
            }
            break;
          }
          if (!isList(lines[i]) && !isCont(lines[i])) break;
          if (isHeading(lines[i]) || isFence(lines[i])) break;
          var m = /^[-*+]\s+(.*)$/.exec(lines[i].trim()) || /^\d+\.\s+(.*)$/.exec(lines[i].trim());
          if (!m) break;
          var parts = [m[1]];
          i++;
          // Soft-wrapped list bodies (sanitize often leaves 0–1 leading spaces)
          while (i < lines.length) {
            if (isBlank(lines[i])) break;
            if (isList(lines[i]) || isHeading(lines[i]) || isFence(lines[i])) break;
            parts.push(lines[i].trim());
            i++;
          }
          items.push("<li>" + mdInline(esc(parts.join(" "))) + "</li>");
        }
        html.push("<" + tag + ">" + items.join("") + "</" + tag + ">");
        continue;
      }

      // paragraph
      var para = [];
      while (i < lines.length) {
        if (isBlank(lines[i])) break;
        if (isHeading(lines[i]) || isList(lines[i]) || isFence(lines[i])) break;
        para.push(lines[i]);
        i++;
      }
      if (para.length) {
        html.push(
          "<p>" +
            mdInline(esc(para.join("\n"))).replace(/\n/g, "<br />") +
            "</p>"
        );
      }
    }
    return html.join("");
  }

  function section(label, text) {
    if (!text) return "";
    var body = mdToHtml(text);
    if (!body) return "";
    return (
      '<section class="doc-section">' +
      '<h3 class="doc-section-label">' +
      esc(label) +
      "</h3>" +
      '<div class="doc-md">' +
      body +
      "</div>" +
      "</section>"
    );
  }

  function findRun(status, tcid, runId, stamp) {
    var stages = (S.normalizeStatus(status).stages) || [];
    for (var i = 0; i < stages.length; i++) {
      var cells = stages[i].cells || [];
      for (var j = 0; j < cells.length; j++) {
        var cases = S.caseList(cells[j]);
        for (var k = 0; k < cases.length; k++) {
          var c = cases[k];
          var id = S.caseId(c);
          var t = c.tcid || labelOf(cells[j]);
          if (stamp && c.stamp && String(c.stamp) === String(stamp) && String(t) === String(tcid)) {
            return { cell: cells[j], run: c };
          }
          if (String(t) === String(tcid) && String(id) === String(runId)) {
            return { cell: cells[j], run: c };
          }
        }
      }
    }
    return null;
  }

  function setModalChrome(kind, idText, titleText) {
    var modal = document.getElementById("case-doc-modal");
    if (!modal) return null;
    modal.setAttribute("data-modal-kind", kind || "case");
    var idEl = modal.querySelector("[data-role='doc-id']");
    var titleTextEl = modal.querySelector("[data-role='doc-title-text']");
    var priorityRow = modal.querySelector("[data-role='doc-priority-row']");
    var createdRow = modal.querySelector("[data-role='doc-created-row']");
    var updatedRow = modal.querySelector("[data-role='doc-updated-row']");
    var idLabel = modal.querySelector(".case-modal-meta dt");
    // First dt is Case / Execution depending on mode
    var dts = modal.querySelectorAll(".case-modal-meta dt");
    if (dts[0]) dts[0].textContent = kind === "run" ? "Execution" : "Case";
    if (dts[1]) dts[1].textContent = kind === "run" ? "Case" : "Title";
    if (idEl) idEl.textContent = idText || "—";
    if (titleTextEl) titleTextEl.textContent = titleText || "…";
    if (priorityRow) priorityRow.hidden = true;
    if (createdRow) createdRow.hidden = true;
    if (updatedRow) updatedRow.hidden = true;
    return modal;
  }

  function openCaseModal(id) {
    var modal = setModalChrome("case", id, "…");
    if (!modal) return;
    var bodyEl = modal.querySelector("[data-role='doc-body']");
    var titleTextEl = modal.querySelector("[data-role='doc-title-text']");
    var priorityEl = modal.querySelector("[data-role='doc-priority']");
    var priorityRow = modal.querySelector("[data-role='doc-priority-row']");
    var createdEl = modal.querySelector("[data-role='doc-created']");
    var createdRow = modal.querySelector("[data-role='doc-created-row']");
    var updatedEl = modal.querySelector("[data-role='doc-updated']");
    var updatedRow = modal.querySelector("[data-role='doc-updated-row']");
    var idEl = modal.querySelector("[data-role='doc-id']");
    if (bodyEl) bodyEl.innerHTML = '<p class="doc-empty">Loading case description…</p>';
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    loadCaseIndex().then(function (index) {
      var doc = lookupCaseDoc(index, id);
      var caseId = fieldText(doc, ["id", "tcid"]) || id;
      var title = fieldText(doc, ["title", "name"]) || "";
      var subtitle = fieldText(doc, ["subtitle"]);
      var priority = (fieldText(doc, ["priority"]) || "").toLowerCase();
      var created = fieldText(doc, ["created", "date_created", "date"]);
      var updated = fieldText(doc, ["updated", "date_updated"]);
      var objective = fieldText(doc, ["objective", "description", "Objective"]);
      var reqs = fieldText(doc, ["requirements", "hardware", "requirements_hardware", "Requirements"]);
      var proc = fieldText(doc, ["procedure", "Procedure"]);
      var pf = fieldText(doc, ["pass_fail", "pass/fail", "Pass/Fail"]);
      var metrics = fieldText(doc, ["metrics", "Metrics"]);
      var comments = fieldText(doc, ["comments", "Comments"]);
      var configs = fieldText(doc, ["configurations", "config", "Configurations"]);
      var published = !!(
        doc &&
        (title || objective || reqs || proc || pf || metrics || comments || configs || subtitle)
      );
      if (idEl) idEl.textContent = caseId;
      if (titleTextEl) titleTextEl.textContent = published && title ? title : "—";
      if (priorityRow && priorityEl) {
        if (priority) {
          priorityEl.innerHTML =
            '<span class="priority-badge priority-' +
            esc(priority) +
            '">' +
            esc(priority) +
            "</span>";
          priorityRow.hidden = false;
        } else {
          priorityRow.hidden = true;
        }
      }
      if (createdRow && createdEl) {
        if (created) {
          createdEl.textContent = created;
          createdRow.hidden = false;
        } else {
          createdRow.hidden = true;
        }
      }
      if (updatedRow && updatedEl) {
        if (updated) {
          updatedEl.textContent = updated;
          updatedRow.hidden = false;
        } else {
          updatedRow.hidden = true;
        }
      }
      if (!published) {
        bodyEl.innerHTML =
          '<p class="doc-empty">No case description published for <code>' +
          esc(id) +
          "</code> yet.</p>";
        return;
      }
      bodyEl.innerHTML =
        (subtitle ? section("Subtitle", subtitle) : "") +
        section("Description", objective) +
        section("Requirements / hardware", reqs) +
        section("Procedure", proc) +
        section("Pass / Fail", pf) +
        section("Comments", comments) +
        section("Metrics captured", metrics) +
        section("Configurations", configs);
    });
  }

  function openRunModal(tcid, runId, stamp) {
    var modal = setModalChrome("run", runId || "—", tcid || "—");
    if (!modal) return;
    var bodyEl = modal.querySelector("[data-role='doc-body']");
    var titleTextEl = modal.querySelector("[data-role='doc-title-text']");
    var createdEl = modal.querySelector("[data-role='doc-created']");
    var createdRow = modal.querySelector("[data-role='doc-created-row']");
    var updatedEl = modal.querySelector("[data-role='doc-updated']");
    var updatedRow = modal.querySelector("[data-role='doc-updated-row']");
    if (bodyEl) bodyEl.innerHTML = '<p class="doc-empty">Loading execution…</p>';
    modal.hidden = false;
    document.body.style.overflow = "hidden";

    var hit = findRun(currentStatus, tcid, runId, stamp);
    var run = hit && hit.run;
    if (!run) {
      bodyEl.innerHTML =
        '<p class="doc-empty">No execution record found for <code>' +
        esc(runId || stamp || tcid) +
        "</code>.</p>";
      return;
    }
    var st = S.statusClass(run.status);
    var started = S.caseStarted(run);
    var finished = S.caseFinished(run);
    var dur = started && finished ? S.formatDuration(started, finished) : "";
    if (titleTextEl) titleTextEl.textContent = run.tcid || tcid || "—";
    if (createdRow && createdEl && started) {
      createdEl.textContent = S.formatLocal(started);
      createdRow.hidden = false;
      var dts = modal.querySelectorAll(".case-modal-meta dt");
      if (dts[2]) {
        /* priority row stays hidden; reuse created as Started */
      }
      var createdDt = createdRow.querySelector("dt");
      if (createdDt) createdDt.textContent = "Started";
    }
    if (updatedRow && updatedEl && finished) {
      updatedEl.textContent = S.formatLocal(finished) + (dur ? " · " + dur : "");
      updatedRow.hidden = false;
      var updatedDt = updatedRow.querySelector("dt");
      if (updatedDt) updatedDt.textContent = "Finished";
    }
    var why = typeof run.why === "string" ? run.why.trim() : "";
    bodyEl.innerHTML =
      '<section class="doc-section">' +
      '<h3 class="doc-section-label">Result</h3>' +
      '<div class="doc-md"><p><strong class="run-status st-' +
      esc(st) +
      '">' +
      esc(st.toUpperCase()) +
      "</strong>" +
      (dur ? " · " + esc(dur) : "") +
      "</p></div></section>" +
      (why ? section("Summary", why) : '<p class="doc-empty">No summary text on this execution record.</p>') +
      '<p class="run-doc-link"><button type="button" class="case-doc-open" data-case-id="' +
      esc(run.tcid || tcid) +
      '">Open case description · ' +
      esc(run.tcid || tcid) +
      "</button></p>";
  }

  function closeCaseModal() {
    var modal = document.getElementById("case-doc-modal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function bind(status) {
    currentStatus = status;
    root.querySelectorAll(".stage-head").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sec = btn.closest(".matrix-stage");
        var sid = sec && sec.getAttribute("data-stage-id");
        stageOpenTouched = true;
        openStageId = String(openStageId) === String(sid) ? null : sid;
        paint(status);
      });
    });
    root.querySelectorAll(".matrix-cell.is-expandable .cell-head").forEach(function (head) {
      head.addEventListener("click", function (e) {
        if (e.target.closest(".case-doc-open")) return;
        var art = head.closest(".matrix-cell");
        var key = art && art.getAttribute("data-key");
        openKey = openKey === key ? null : key;
        paint(status);
      });
    });
    root.querySelectorAll(".case-doc-open").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openCaseModal(btn.getAttribute("data-case-id"));
      });
    });
    root.querySelectorAll(".run-open").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openRunModal(
          btn.getAttribute("data-tcid"),
          btn.getAttribute("data-run-id"),
          btn.getAttribute("data-stamp")
        );
      });
    });
  }

  function paint(status) {
    var norm = S.normalizeStatus(status);
    renderHeader(status);
    var stages = norm.stages || [];
    root.innerHTML =
      renderLegend() +
      (status.campaign
        ? '<p class="matrix-campaign">' + esc(status.campaign) + "</p>"
        : "") +
      stages.map(renderStage).join("");
    bind(status);
  }

  function fail(err) {
    if (metaEl) metaEl.textContent = "Status feed failed to load.";
    root.innerHTML =
      '<p class="matrix-error">Could not load the validation status feed.</p>';
    console.warn("matrix status load failed", err);
  }

  if (!S || !root) return;

  var modal = document.getElementById("case-doc-modal");
  if (modal) {
    var closer = modal.querySelector(".case-modal-close");
    if (closer) closer.addEventListener("click", closeCaseModal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeCaseModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) closeCaseModal();
    });
  }
  loadCaseIndex();

  // Case-doc buttons rendered inside the run modal body
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("#case-doc-modal .case-doc-open");
    if (!t) return;
    e.preventDefault();
    openCaseModal(t.getAttribute("data-case-id"));
  });


  var POLL_MS = 20000;
  var lastFingerprint = null;
  var currentStatus = null;
  var pollTimer = null;

  function fingerprint(status) {
    if (!status) return "";
    return (
      String(S.statusUpdatedAt(status) || "") +
      "|" +
      String(S.gitCommit(status) || "") +
      "|" +
      String(status._source_file || "")
    );
  }

  function applyStatus(status, isFirst) {
    currentStatus = status;
    var fp = fingerprint(status);
    if (!isFirst && fp === lastFingerprint) return;
    lastFingerprint = fp;
    if (isFirst || openKey == null) openKey = pickDefaultOpen(status);
    if (isFirst || !stageOpenTouched) openStageId = pickDefaultOpenStage(status);
    paint(status);
    // Keep footer in sync without a full reload.
    document.querySelectorAll(".viewer-stale").forEach(function (el) {
      if (typeof el._statusRefresh === "function") el._statusRefresh();
    });
  }

  function tick(isFirst) {
    if (document.hidden && !isFirst) return;
    S.loadCampaignStatus("../data")
      .then(function (status) {
        applyStatus(status, !!isFirst);
      })
      .catch(function (err) {
        if (isFirst || !currentStatus) fail(err);
        else console.warn("matrix status poll failed", err);
      });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) tick(false);
  });

  tick(true);
  pollTimer = setInterval(function () {
    tick(false);
  }, POLL_MS);
})();
