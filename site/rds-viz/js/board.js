/**
 * Stylized RDS 2.0 control-board schematic — ORIGINAL SVG artwork.
 * Topology portrayed: control board, PSU, fans, hashboard chain seats.
 * Schematic ≠ photo. No vendor dumps. No invented measurements.
 */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  var REGIONS = {
    psu: {
      kind: "psu",
      x: 36, y: 180, w: 120, h: 160,
      label: "PSU",
      caption: "system power",
      sub: "DC rails → control board",
    },
    fan0: {
      kind: "fan",
      x: 210, y: 48, w: 88, h: 72,
      label: "FAN 0",
      caption: "airflow",
      sub: "PWM from control board",
    },
    fan1: {
      kind: "fan",
      x: 320, y: 48, w: 88, h: 72,
      label: "FAN 1",
      caption: "airflow",
      sub: "PWM from control board",
    },
    control: {
      kind: "control",
      x: 200, y: 160, w: 320, h: 220,
      label: "RDS 2.0",
      caption: "control board",
      sub: "host · chain UART · power / fan ctrl",
    },
    hb0: {
      kind: "hashboard",
      x: 600, y: 96, w: 200, h: 88,
      label: "HB0",
      caption: "hashboard · chain seat 0",
      sub: "BZM2 ASIC chain",
    },
    hb1: {
      kind: "hashboard",
      x: 600, y: 220, w: 200, h: 88,
      label: "HB1",
      caption: "hashboard · chain seat 1",
      sub: "BZM2 ASIC chain",
    },
    hb2: {
      kind: "hashboard",
      x: 600, y: 344, w: 200, h: 88,
      label: "HB2",
      caption: "hashboard · chain seat 2",
      sub: "BZM2 ASIC chain",
    },
  };

  function el(name, attrs, text) {
    var node = document.createElementNS(NS, name);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        node.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function makeRegion(role, spec) {
    var g = el("g", {
      class: "region region-" + spec.kind + " inactive",
      id: "region-" + role,
      "data-role": role,
      "data-kind": spec.kind,
    });

    g.appendChild(
      el("rect", {
        class: "region-heat",
        x: spec.x - 5,
        y: spec.y - 5,
        width: spec.w + 10,
        height: spec.h + 10,
        rx: 8,
      })
    );

    g.appendChild(
      el("rect", {
        class: "region-body",
        x: spec.x,
        y: spec.y,
        width: spec.w,
        height: spec.h,
        rx: spec.kind === "fan" ? 36 : 6,
      })
    );

    if (spec.kind === "psu") {
      g.appendChild(
        el("rect", {
          class: "region-connector",
          x: spec.x + spec.w - 2,
          y: spec.y + spec.h / 2 - 8,
          width: 18,
          height: 16,
          rx: 2,
        })
      );
    }

    if (spec.kind === "hashboard") {
      g.appendChild(
        el("rect", {
          class: "region-connector",
          x: spec.x - 14,
          y: spec.y + spec.h / 2 - 10,
          width: 16,
          height: 20,
          rx: 2,
        })
      );
      for (var i = 0; i < 4; i++) {
        g.appendChild(
          el("rect", {
            class: "asic-hint",
            x: spec.x + 28 + i * 38,
            y: spec.y + 34,
            width: 28,
            height: 28,
            rx: 3,
          })
        );
      }
    }

    if (spec.kind === "fan") {
      var cx = spec.x + spec.w / 2;
      var cy = spec.y + spec.h / 2;
      g.appendChild(el("circle", { class: "fan-hub", cx: cx, cy: cy, r: 8 }));
      g.appendChild(
        el("circle", {
          class: "fan-ring",
          cx: cx,
          cy: cy,
          r: 26,
          fill: "none",
        })
      );
    }

    if (spec.kind === "control") {
      g.appendChild(
        el("rect", {
          class: "landmark",
          x: spec.x + 18,
          y: spec.y + 48,
          width: 110,
          height: 70,
          rx: 4,
        })
      );
      g.appendChild(
        el(
          "text",
          {
            class: "landmark-label",
            x: spec.x + 73,
            y: spec.y + 80,
            "text-anchor": "middle",
          },
          "HOST / MCU"
        )
      );
      g.appendChild(
        el(
          "text",
          {
            class: "landmark-label",
            x: spec.x + 73,
            y: spec.y + 96,
            "text-anchor": "middle",
          },
          "chain UART"
        )
      );
      g.appendChild(
        el("rect", {
          class: "landmark",
          x: spec.x + 150,
          y: spec.y + 48,
          width: 70,
          height: 36,
          rx: 3,
        })
      );
      g.appendChild(
        el(
          "text",
          {
            class: "landmark-label",
            x: spec.x + 185,
            y: spec.y + 70,
            "text-anchor": "middle",
          },
          "FAN HDR"
        )
      );
      g.appendChild(
        el("rect", {
          class: "landmark",
          x: spec.x + 18,
          y: spec.y + 140,
          width: 70,
          height: 36,
          rx: 3,
        })
      );
      g.appendChild(
        el(
          "text",
          {
            class: "landmark-label",
            x: spec.x + 53,
            y: spec.y + 162,
            "text-anchor": "middle",
          },
          "PWR IN"
        )
      );
      g.appendChild(
        el("rect", {
          class: "landmark",
          x: spec.x + 230,
          y: spec.y + 48,
          width: 70,
          height: 128,
          rx: 3,
        })
      );
      g.appendChild(
        el(
          "text",
          {
            class: "landmark-label",
            x: spec.x + 265,
            y: spec.y + 78,
            "text-anchor": "middle",
          },
          "CHAIN"
        )
      );
      g.appendChild(
        el(
          "text",
          {
            class: "landmark-label",
            x: spec.x + 265,
            y: spec.y + 96,
            "text-anchor": "middle",
          },
          "UART"
        )
      );
      for (var p = 0; p < 3; p++) {
        g.appendChild(
          el("rect", {
            class: "chain-port",
            x: spec.x + 248,
            y: spec.y + 112 + p * 18,
            width: 34,
            height: 10,
            rx: 2,
          })
        );
      }
    }

    var labelX =
      spec.kind === "hashboard" || spec.kind === "psu"
        ? spec.x + 12
        : spec.x + spec.w / 2;
    var labelAnchor =
      spec.kind === "hashboard" || spec.kind === "psu" ? "start" : "middle";

    g.appendChild(
      el(
        "text",
        {
          class: "region-label",
          x: labelX,
          y: spec.y + 18,
          "text-anchor": labelAnchor,
        },
        spec.label
      )
    );
    g.appendChild(
      el(
        "text",
        {
          class: "region-caption",
          x: labelX,
          y: spec.y + (spec.kind === "hashboard" ? 30 : 34),
          "text-anchor": labelAnchor,
        },
        spec.caption
      )
    );
    if (spec.sub) {
      g.appendChild(
        el(
          "text",
          {
            class: "region-sub",
            x: spec.x + 10,
            y: spec.y + spec.h + 16,
          },
          spec.sub
        )
      );
    }

    return g;
  }

  function harnessLines(svg) {
    var g = el("g", { class: "harness", "aria-hidden": "true" });
    g.appendChild(
      el("path", { class: "harness-power", d: "M 156 260 H 200", fill: "none" })
    );
    g.appendChild(
      el("path", { class: "harness-signal", d: "M 254 120 V 160", fill: "none" })
    );
    g.appendChild(
      el("path", { class: "harness-signal", d: "M 364 120 V 160", fill: "none" })
    );
    g.appendChild(
      el("path", {
        class: "harness-chain",
        d: "M 520 200 H 560 V 140 H 600",
        fill: "none",
      })
    );
    g.appendChild(
      el("path", { class: "harness-chain", d: "M 520 260 H 600", fill: "none" })
    );
    g.appendChild(
      el("path", {
        class: "harness-chain",
        d: "M 520 320 H 560 V 388 H 600",
        fill: "none",
      })
    );
    g.appendChild(
      el(
        "text",
        {
          class: "landmark-label",
          x: 540,
          y: 250,
          "text-anchor": "middle",
        },
        "chain"
      )
    );
    svg.appendChild(g);
  }

  function buildSVG(container, opts) {
    opts = opts || {};
    container.innerHTML = "";
    var svg = el("svg", {
      viewBox: "0 0 860 560",
      role: "img",
      "aria-label":
        "Stylized RDS 2.0 control-board schematic: PSU, fans, control board, and three hashboard chain seats",
    });
    if (opts.compact) svg.setAttribute("class", "is-compact");

    svg.appendChild(
      el("rect", {
        class: "chassis-bg",
        x: 16,
        y: 16,
        width: 828,
        height: 500,
        rx: 10,
      })
    );
    svg.appendChild(
      el(
        "text",
        {
          class: "face-label",
          x: 430,
          y: 42,
          "text-anchor": "middle",
        },
        "RDS 2.0 · CONTROL PLANE + HASHBOARD CHAIN"
      )
    );

    harnessLines(svg);

    var layer = el("g", { id: "regions-layer" });
    Object.keys(REGIONS).forEach(function (role) {
      layer.appendChild(makeRegion(role, REGIONS[role]));
    });
    svg.appendChild(layer);

    svg.appendChild(
      el(
        "text",
        {
          class: "landmark-label",
          x: 430,
          y: 536,
          "text-anchor": "middle",
          style: "font-size:7.5px",
        },
        "schematic ≠ photo  ·  seats are topological  ·  heat/status affordances reserved (no invented figures)"
      )
    );

    container.appendChild(svg);
    setActive(container, ["control", "hb0", "psu", "fan0", "fan1"]);
    return { svg: svg, regions: REGIONS };
  }

  function setActive(container, roles) {
    var set = {};
    (roles || []).forEach(function (r) {
      set[r] = true;
    });
    container.querySelectorAll(".region").forEach(function (g) {
      var role = g.getAttribute("data-role");
      if (set[role]) {
        g.classList.add("active");
        g.classList.remove("inactive");
      } else {
        g.classList.add("inactive");
        g.classList.remove("active");
      }
    });
  }

  /** Optional later hook. Pass null to clear. Call sites must supply real data. */
  function setHeat(container, role, tempC) {
    var g = container.querySelector("#region-" + role);
    if (!g) return;
    var heat = g.querySelector(".region-heat");
    if (!heat) return;
    if (tempC == null || isNaN(tempC)) {
      heat.style.fill = "";
      return;
    }
    var t = Math.max(0, Math.min(1, (tempC - 35) / 35));
    var color =
      t < 0.5
        ? lerp("#3b82f6", "#f59e0b", t / 0.5)
        : lerp("#f59e0b", "#ef4444", (t - 0.5) / 0.5);
    heat.style.fill = color;
  }

  function lerp(a, b, t) {
    function hex(h) {
      h = h.replace("#", "");
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    }
    var A = hex(a);
    var B = hex(b);
    return (
      "rgb(" +
      Math.round(A[0] + (B[0] - A[0]) * t) +
      "," +
      Math.round(A[1] + (B[1] - A[1]) * t) +
      "," +
      Math.round(A[2] + (B[2] - A[2]) * t) +
      ")"
    );
  }

  function mount(container) {
    if (!container) return null;
    var compact =
      container.getAttribute("data-compact") === "1" ||
      container.getAttribute("data-compact") === "1";
    return buildSVG(container, { compact: compact });
  }

  global.RdsBoard = {
    mount: mount,
    buildSVG: buildSVG,
    setActive: setActive,
    setHeat: setHeat,
    REGIONS: REGIONS,
  };
})(window);
