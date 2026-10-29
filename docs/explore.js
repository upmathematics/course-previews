/* Spring 2027 course preview page: page scripts.
   1. Inline the SVG figures so their colors follow each course's theme.
   2. The three Explore More panels and the "Try it" links.
   All data in the panels is simulated for demonstration. */

/* Inline the SVG figures so their colors match the page.
   If fetching fails (e.g. opened from disk), the <img> stays as a fallback. */
document.querySelectorAll("img[data-inline]").forEach(async (img) => {
  try {
    const res = await fetch(img.getAttribute("src"));
    if (!res.ok) return;
    const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== "svg") return;
    svg.setAttribute("width", "360");
    svg.setAttribute("height", "440");
    img.replaceWith(document.importNode(svg, true));
  } catch (e) { /* keep the <img> */ }
});

/* "Explore More" panels for the Spring 2027 course page.
   Each course gets an interactive, more detailed version of its figure.
   Plain JavaScript, no libraries. Every panel is built the first time it opens. */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  var NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function rng(seed) { // mulberry32: same "random" data on every visit
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(r) {
    var u = 0; while (u === 0) u = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
  }
  function pct(x) { return isFinite(x) ? Math.round(100 * x) + "%" : "n/a"; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hourLabel(h) { return h === 12 ? "noon" : h < 12 ? h + " AM" : (h - 12) + " PM"; }
  function money(x) { return "$" + x.toFixed(2); }
  var WHY_SIM = {
    "291x": "We made both groups' qualifications exactly the same. That's the only way to be sure the gap comes from the stand-ins, " +
      "like neighborhood, and not from real differences between applicants. Real hiring, admissions, lending, and court records about people are also private.",
    "361": "Because we created the data, we know the true answer (for example, the true average, or exactly 52% support), so you can check how close each sample gets. " +
      "With real data the true value is unknown, which is exactly why we need statistics. Simulating samples like this is a standard tool statisticians use to test their methods.",
    "391": "Riverton is a made-up city whose data was built to behave like real city data: commute peaks, seasonal patterns, a pollution hotspot near a highway. " +
      "That keeps every view easy to read without exposing anyone's location or health records."
  };
  function simNote(course) {
    return '<div class="alert alert-info sim-note"><p><strong>Why simulated data?</strong> ' + WHY_SIM[course] + "</p>" +
      "<p><em>The numbers here aren't real-world findings; in the course, you'll work with real data sets.</em></p>" +
      '<details class="recipe"><summary>How this data was made</summary><div class="recipe-body" id="x' + course + '-recipe"></div></details></div>';
  }

  /* =====================================================================
     MTH 291X: a model that learned from biased past decisions, in four settings
     ===================================================================== */
  function build291(root) {
    var r = rng(2912);

    /* ---------- an algorithm that learned from biased past decisions, in four settings ---------- */
    // 100 people per group with the SAME base scores. The model never sees group, but two inputs
    // differ by group and carry penalties learned from past decisions.
    var quals = [];
    for (var qi = 0; qi < 100; qi++) quals.push(Math.max(20, Math.min(98, Math.round(62 + 12 * normal(r)))));
    function assign(n, k, rr) { // exactly k of n flagged, in a shuffled order
      var a = []; for (var i = 0; i < n; i++) a.push(i < k);
      for (var j = n - 1; j > 0; j--) { var t = Math.floor(rr() * (j + 1)), tmp = a[j]; a[j] = a[t]; a[t] = tmp; }
      return a;
    }
    var S = {
      hiring: {
        label: "Hiring", heading: "Same résumé, different score",
        story: "A company trains an algorithm on its past hiring decisions to score new applicants. In the past, it hired fewer people from group B, and most of group B lives in the South neighborhood and has a longer commute.",
        people: "applicants", base: "Qualifications (degree, experience, skills test)", baseShort: "qualifications", baseRow: "Average qualification score",
        scoreLabel: "the model's score", outcome: "Get an interview", verbYes: "interview", verbNo: "no interview", rateWord: "get interviews",
        cutLabel: "Interview cutoff",
        inputs: [{ name: "Neighborhood", help: "Learned from the past: −14 points for South", flag: "live in the South neighborhood", pen: 14, a: 15, b: 85 },
                 { name: "Commute distance", help: "Learned from the past: −6 points for a long commute", flag: "have a long commute", pen: 6, a: 30, b: 70 }],
        pair: "Two applicants with identical résumés", pairA: "North, short commute", pairB: "South, long commute"
      },
      admissions: {
        label: "College admissions", heading: "Same application, different rank",
        story: "A university trains a model on past admissions decisions to rank applicants. Group B students more often attend high schools that rarely sent students before, and fewer have a parent who is an alum.",
        people: "applicants", base: "Grades, coursework, and essays", baseShort: "grades, coursework, and essays", baseRow: "Average application score",
        scoreLabel: "the model's rank score", outcome: "Admitted", verbYes: "admitted", verbNo: "not admitted", rateWord: "are admitted",
        cutLabel: "Admission cutoff",
        inputs: [{ name: "High school attended", help: "Learned from the past: −12 points for schools that sent few students before", flag: "attended a high school that sent few students before", pen: 12, a: 20, b: 80 },
                 { name: "Legacy status", help: "Learned from the past: −8 points without an alum parent", flag: "don't have a parent who is an alum", pen: 8, a: 50, b: 90 }],
        pair: "Two students with identical applications", pairA: "well-known school, alum parent", pairB: "lesser-known school, no alum parent"
      },
      lending: {
        label: "Lending and data privacy", heading: "Same finances, different answer",
        story: "A lender's model adds data bought from data brokers to each application, data most people don't know was collected. Group B more often uses an older or budget phone and shops at discount stores.",
        people: "applicants", base: "Income, payment history, and existing debt", baseShort: "finances", baseRow: "Average financial score",
        scoreLabel: "the model's credit score", outcome: "Loan approved", verbYes: "approved", verbNo: "denied", rateWord: "are approved",
        cutLabel: "Approval cutoff",
        inputs: [{ name: "Phone type", help: "Bought from a data broker: −10 points for an older or budget phone", flag: "use an older or budget phone", pen: 10, a: 25, b: 70 },
                 { name: "Shopping data", help: "Bought from a data broker: −8 points for shopping mostly at discount stores", flag: "shop mostly at discount stores", pen: 8, a: 30, b: 75 }],
        pair: "Two applicants with identical finances", pairA: "new phone, department stores", pairB: "budget phone, discount stores"
      },
      justice: {
        label: "Criminal justice", heading: "Same case, different risk score",
        story: "A court uses a model trained on past cases to score people awaiting trial; higher scores mean lower predicted risk. Police patrol group B's neighborhood more heavily, so the same behavior leads to more recorded arrests.",
        people: "people awaiting trial", base: "Current charge and court-appearance record", baseShort: "cases", baseRow: "Average case score",
        scoreLabel: "the model's release score", outcome: "Released before trial", verbYes: "released", verbNo: "held", rateWord: "are released",
        cutLabel: "Release cutoff",
        inputs: [{ name: "Prior arrests", help: "Learned from the past: −15 points for any prior arrest", flag: "have a recorded prior arrest", pen: 15, a: 20, b: 60 },
                 { name: "Neighborhood", help: "Learned from the past: −6 points for South", flag: "live in the South neighborhood", pen: 6, a: 15, b: 85 }],
        pair: "Two people with identical cases", pairA: "no recorded arrest, North", pairB: "one recorded arrest, South"
      }
    };
    var ORDER = ["hiring", "admissions", "lending", "justice"];
    ORDER.forEach(function (k, si) {
      var rr = rng(4000 + si), d = S[k];
      d.people_ = [];
      [["A", "a"], ["B", "b"]].forEach(function (g) {
        var f1 = assign(100, d.inputs[0][g[1]], rr), f2 = assign(100, d.inputs[1][g[1]], rr);
        quals.forEach(function (q, i) { d.people_.push({ g: g[0], q: q, f: [f1[i], f2[i]] }); });
      });
    });

    root.innerHTML = simNote("291x") +
      '<p class="explore-intro">In each setting, 200 simulated people, 100 in group A and 100 in group B, have <em>exactly the same</em> qualifications. ' +
      'The model is never told anyone\'s group. Turn its inputs on and off and watch who gets a good outcome.</p>' +
      '<div class="btn-toolbar scen-bar" id="x291-scen" role="group" aria-label="Setting">' + ORDER.map(function (k, i) {
        return '<button type="button" class="btn btn-default btn-sm' + (i ? "" : " active") + '" data-s="' + k + '" aria-pressed="' + (i ? "false" : "true") + '">' + S[k].label + "</button>";
      }).join("") + "</div>" +
      '<div class="callout" id="x291-card"></div>' +
      '<div class="explore-grid">' +
      '  <div>' +
      '    <div class="well">' +
      '      <p class="control-label" style="margin-top:0">What the model uses</p>' +
      '      <div class="checkbox"><label><input type="checkbox" checked disabled> <span id="x291-base"></span></label></div>' +
      '      <div class="checkbox"><label><input type="checkbox" id="x291-in0" checked> <span id="x291-n0"></span> <small class="help" id="x291-h0"></small></label></div>' +
      '      <div class="checkbox"><label><input type="checkbox" id="x291-in1" checked> <span id="x291-n1"></span> <small class="help" id="x291-h1"></small></label></div>' +
      '      <div class="form-group" style="margin-top:12px"><label for="x291-cut"><span id="x291-cutl">Cutoff</span> <span class="badge" id="x291-cutv">65</span></label>' +
      '        <input type="range" id="x291-cut" min="40" max="85" step="1" value="65"></div>' +
      "    </div>" +
      '    <table class="table table-condensed stats-table pay-table"><thead><tr><th></th><th>Group A</th><th>Group B</th><th>B minus A</th></tr></thead><tbody id="x291-hire"></tbody></table>' +
      '    <div class="resume-pair" id="x291-pair"></div>' +
      "  </div>" +
      '  <div><h4 id="x291-ptitle"></h4>' +
      '    <svg id="x291-hiresvg" viewBox="0 0 400 300" role="img" aria-label="How the model treats groups A and B in this setting"></svg>' +
      '    <p class="legend-line" id="x291-legend"></p>' +
      '    <div class="alert alert-warning" id="x291-hirenote"></div></div>' +
      "</div>";

    var hsvg = root.querySelector("#x291-hiresvg");
    var in0 = root.querySelector("#x291-in0"), in1 = root.querySelector("#x291-in1"), cutIn = root.querySelector("#x291-cut");
    var cur = "hiring";
    function t291(x, y, s, cls, anchor) { var t = svgEl("text", { x: x, y: y, "class": cls || "svg-small", "text-anchor": anchor || "start" }, hsvg); t.textContent = s; return t; }
    function sq(cls) { return '<span class="dot ' + cls + '"></span>'; }

    /* each setting pictures the same model a different way */
    var CHARTS = {
      // hiring: one square per applicant, filled if they get an interview
      hiring: {
        title: "Each square is one applicant; filled squares get an interview",
        legend: sq("dotA") + " Group A " + sq("dotB") + " Group B " + sq("dotFaded") + " no interview",
        draw: function (d, sc, cut, pass) {
          [["A", 22], ["B", 222]].forEach(function (g) {
            t291(g[1], 22, "Group " + g[0], "svg-title");
            t291(g[1], 38, pass[g[0]] + " of 100 " + d.rateWord.replace("are ", "").replace("get ", "get "), "svg-small");
            var ppl = d.people_.map(function (p, i) { return i; }).filter(function (i) { return d.people_[i].g === g[0]; })
              .sort(function (i, j) { return sc[j] - sc[i]; });
            ppl.forEach(function (i, k) {
              var x = g[1] + (k % 10) * 16, y = 50 + Math.floor(k / 10) * 16;
              svgEl("rect", { x: x, y: y, width: 14, height: 14, "class": "wcell grp" + g[0] + (sc[i] < cut ? " below" : "") }, hsvg);
            });
          });
          t291(200, 236, "Both groups have exactly the same qualifications.", "svg-small", "middle");
          t291(200, 252, "Squares are sorted by the model's score, highest first.", "svg-small", "middle");
        }
      },
      // admissions: all 200 applicants in rank order
      admissions: {
        title: "All 200 applicants in the model's rank order (1st at top left); filled = admitted",
        legend: sq("dotA") + " Group A " + sq("dotB") + " Group B " + sq("dotFaded") + " not admitted",
        draw: function (d, sc, cut, pass) {
          var idx = d.people_.map(function (_, i) { return i; }).sort(function (i, j) {
            return (sc[j] - sc[i]) || ((i % 100) - (j % 100)) || (i - j);
          });
          idx.forEach(function (i, k) {
            var x = 10 + (k % 20) * 19, y = 30 + Math.floor(k / 20) * 19;
            svgEl("rect", { x: x, y: y, width: 17, height: 17, "class": "wcell grp" + d.people_[i].g + (sc[i] < cut ? " below" : "") }, hsvg);
          });
          t291(10, 22, "1st", "svg-small svg-strong");
          t291(390, 236, "200th", "svg-small svg-strong", "end");
          var nAdm = pass.A + pass.B, topA = 0, topB = 0;
          idx.slice(0, 40).forEach(function (i) { if (d.people_[i].g === "A") topA++; else topB++; });
          t291(10, 256, nAdm + " admitted: " + pass.A + " from group A, " + pass.B + " from group B.", "svg-small svg-strong");
          t291(10, 272, "The top 40 ranks: " + topA + " from A, " + topB + " from B.", "svg-small");
        }
      },
      // lending: approval rate for every possible cutoff
      lending: {
        title: "Approval rate at every possible cutoff",
        legend: '<span class="lineA"></span> Group A <span class="lineB"></span> Group B; the shaded band is the gap',
        draw: function (d, sc, cut) {
          var X0 = 46, X1 = 384, Y0 = 20, Y1 = 250, c0 = 40, c1 = 85;
          var sx = function (c) { return X0 + (c - c0) / (c1 - c0) * (X1 - X0); }, sy = function (r_) { return Y1 - r_ * (Y1 - Y0); };
          [0, 0.25, 0.5, 0.75, 1].forEach(function (f) { svgEl("line", { x1: X0, x2: X1, y1: sy(f), y2: sy(f), "class": "gridline" }, hsvg); t291(X0 - 6, sy(f) + 4, Math.round(100 * f) + "%", "svg-small", "end"); });
          [40, 50, 60, 70, 80].forEach(function (c) { t291(sx(c), Y1 + 16, c, "svg-small", "middle"); });
          t291(X1, Y1 + 32, "cutoff score", "svg-small", "end");
          var rate = function (g, c) { var k = 0; d.people_.forEach(function (p, i) { if (p.g === g && sc[i] >= c) k++; }); return k / 100; };
          var A = [], B = [];
          for (var c = c0; c <= c1; c += 1) { A.push([sx(c), sy(rate("A", c))]); B.push([sx(c), sy(rate("B", c))]); }
          svgEl("polygon", { points: A.concat(B.slice().reverse()).map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "), "class": "gapband" }, hsvg);
          svgEl("polyline", { points: A.map(function (q) { return q.join(","); }).join(" "), "class": "rateA" }, hsvg);
          svgEl("polyline", { points: B.map(function (q) { return q.join(","); }).join(" "), "class": "rateB" }, hsvg);
          svgEl("line", { x1: sx(cut), x2: sx(cut), y1: Y0, y2: Y1, "class": "thresh" }, hsvg);
          var ra = rate("A", cut), rb = rate("B", cut);
          svgEl("circle", { cx: sx(cut), cy: sy(ra), r: 4, "class": "pt grpA" }, hsvg);
          svgEl("circle", { cx: sx(cut), cy: sy(rb), r: 4, "class": "pt grpB" }, hsvg);
          var right = cut < 70;
          t291(sx(cut) + (right ? 7 : -7), sy(ra) - 4, "A " + Math.round(100 * ra) + "%", "svg-small svg-strong gaplabel", right ? "start" : "end");
          t291(sx(cut) + (right ? 7 : -7), sy(rb) + 13, "B " + Math.round(100 * rb) + "%", "svg-small svg-strong gaplabel", right ? "start" : "end");
        }
      },
      // criminal justice: share of each group in each release-score range
      justice: {
        title: "Share of each group in each release-score range",
        legend: sq("dotA") + " Group A " + sq("dotB") + " Group B; bars left of the dashed line are held",
        draw: function (d, sc, cut) {
          var X0 = 40, X1 = 386, Y0 = 26, Y1 = 238, s0 = 25, s1 = 95, bins = [25, 35, 45, 55, 65, 75, 85];
          var sx = function (v) { return X0 + (v - s0) / (s1 - s0) * (X1 - X0); };
          var cnt = { A: bins.map(function () { return 0; }), B: bins.map(function () { return 0; }) };
          d.people_.forEach(function (p, i) { var b = Math.max(0, Math.min(bins.length - 1, Math.floor((sc[i] - s0) / 10))); cnt[p.g][b]++; });
          var maxc = Math.max.apply(null, cnt.A.concat(cnt.B)), ymax = Math.ceil(maxc / 10) * 10 + 5;
          var sy = function (v) { return Y1 - v / ymax * (Y1 - Y0); };
          [0, 20, 40].filter(function (v) { return v <= ymax; }).forEach(function (v) { svgEl("line", { x1: X0, x2: X1, y1: sy(v), y2: sy(v), "class": "gridline" }, hsvg); t291(X0 - 6, sy(v) + 4, v + "%", "svg-small", "end"); });
          bins.forEach(function (b, k) {
            var bx = sx(b), bw = (sx(b + 10) - bx) / 2 - 3;
            ["A", "B"].forEach(function (g, gi) {
              var v = cnt[g][k];
              svgEl("rect", { x: bx + 3 + gi * (bw + 1), y: sy(v), width: bw, height: Y1 - sy(v), "class": "jbar grp" + g + (b + 10 <= cut ? " below" : "") }, hsvg);
            });
            t291(bx, Y1 + 15, b, "svg-small", "middle");
          });
          t291(sx(95), Y1 + 15, 95, "svg-small", "middle");
          svgEl("line", { x1: sx(cut), x2: sx(cut), y1: Y0 - 8, y2: Y1, "class": "thresh" }, hsvg);
          t291(sx(cut) + 4, Y0 - 12, "release cutoff " + cut, "svg-small svg-strong gaplabel");
          t291(X0, Y1 + 32, "← higher predicted risk", "svg-small");
          t291(X1, Y1 + 32, "lower predicted risk →", "svg-small", "end");
        }
      }
    };

    function render() {
      var d = S[cur], on = [in0.checked, in1.checked], cut = +cutIn.value;
      var score = function (p) { return p.q - (on[0] && p.f[0] ? d.inputs[0].pen : 0) - (on[1] && p.f[1] ? d.inputs[1].pen : 0); };
      root.querySelector("#x291-cutv").textContent = cut;
      var sc = d.people_.map(score), pass = { A: 0, B: 0 }, mean = { A: 0, B: 0 };
      d.people_.forEach(function (p, i) { mean[p.g] += sc[i]; if (sc[i] >= cut) pass[p.g]++; });
      clear(hsvg);
      CHARTS[cur].draw(d, sc, cut, pass);
      var avgQ = (quals.reduce(function (a, b) { return a + b; }, 0) / 100).toFixed(1);
      var diff = (mean.B - mean.A) / 100;
      root.querySelector("#x291-hire").innerHTML =
        "<tr><td>" + d.baseRow + "</td><td>" + avgQ + "</td><td>" + avgQ + "</td><td>same</td></tr>" +
        "<tr><td>Average model score</td><td>" + (mean.A / 100).toFixed(1) + "</td><td>" + (mean.B / 100).toFixed(1) + "</td><td>" +
        (diff >= 0 ? "+" : "−") + Math.abs(diff).toFixed(1) + "</td></tr>" +
        '<tr class="grp-row"><td>' + d.outcome + "</td><td>" + pass.A + "%</td><td>" + pass.B + "%</td><td>" +
        (pass.B - pass.A >= 0 ? "+" : "−") + Math.abs(pass.B - pass.A) + " pts</td></tr>";
      var sA = 74, sB = 74 - (on[0] ? d.inputs[0].pen : 0) - (on[1] ? d.inputs[1].pen : 0);
      var verdict = function (s) { return s >= cut ? '<span class="ok">' + d.verbYes + "</span>" : '<span class="no">' + d.verbNo + "</span>"; };
      root.querySelector("#x291-pair").innerHTML =
        '<p class="control-label">' + d.pair + " (base score 74)</p>" +
        '<table class="table table-condensed stats-table pay-table"><tbody>' +
        "<tr><td>Person 1: " + d.pairA + "</td><td>score " + sA + "</td><td>" + verdict(sA) + "</td></tr>" +
        "<tr><td>Person 2: " + d.pairB + "</td><td>score " + sB + "</td><td>" + verdict(sB) + "</td></tr></tbody></table>";
      var n0 = d.inputs[0].name.toLowerCase(), n1 = d.inputs[1].name.toLowerCase(), note;
      if (on[0] && on[1]) note = "<strong>Same " + d.baseShort + ", different chances.</strong> The model never sees anyone's group, but " + n0 + " and " + n1 +
        " stand in for it. It copied the pattern in past decisions, so equally qualified people in group B score lower and " + d.rateWord + " less often.";
      else if (on[0] || on[1]) note = "<strong>Better, but a gap remains.</strong> You removed one stand-in for group, but " + (on[0] ? n0 : n1) +
        " still carries the same pattern. Removing the group label, or even one stand-in, isn't enough.";
      else note = "<strong>No gap.</strong> With both stand-ins removed, the model scores people only on " + d.baseShort + ", and both groups " + d.rateWord +
        " at the same rate. Finding the stand-ins takes looking at the data, not just at the list of inputs.";
      var hn = root.querySelector("#x291-hirenote");
      hn.innerHTML = note;
      hn.className = "alert " + (on[0] || on[1] ? "alert-warning" : "alert-success");
    }
    function setScenario(key) {
      cur = key; var d = S[key];
      root.querySelectorAll("#x291-scen button").forEach(function (b) {
        var onB = b.getAttribute("data-s") === key; b.classList.toggle("active", onB); b.setAttribute("aria-pressed", String(onB));
      });
      root.querySelector("#x291-card").innerHTML = "<h4>" + d.heading + "</h4><p>" + d.story + "</p>";
      root.querySelector("#x291x-recipe").innerHTML = "<ul>" +
        "<li><b>Qualifications:</b> 100 scores drawn at random from a bell curve centered at 62 (SD 12), then given to <em>both</em> groups, so group A and group B have identical scores.</li>" +
        d.inputs.map(function (inp) {
          return "<li><b>" + inp.name + ":</b> " + inp.a + "% of group A and " + inp.b + "% of group B " + inp.flag + ". The model subtracts " + inp.pen + " points for that.</li>";
        }).join("") +
        "<li><b>The model's score</b> is the qualification score minus those penalties, and the cutoff is whatever you set (it starts at 65). Every other number on this panel follows from these rules.</li></ul>";
      root.querySelector("#x291-base").textContent = d.base;
      [0, 1].forEach(function (i) {
        root.querySelector("#x291-n" + i).textContent = d.inputs[i].name;
        root.querySelector("#x291-h" + i).textContent = d.inputs[i].help;
      });
      in0.checked = in1.checked = true;
      cutIn.value = 65;
      root.querySelector("#x291-cutl").textContent = d.cutLabel;
      root.querySelector("#x291-ptitle").textContent = CHARTS[key].title;
      root.querySelector("#x291-legend").innerHTML = CHARTS[key].legend;
      render();
    }
    root.querySelectorAll("#x291-scen button").forEach(function (b) { b.addEventListener("click", function () { setScenario(b.getAttribute("data-s")); }); });
    [in0, in1].forEach(function (c) { c.addEventListener("change", render); });
    cutIn.addEventListener("input", render);
    setScenario("hiring");
    return { setScenario: setScenario };
  }

  /* =====================================================================
     MTH 361: sampling distribution simulator, with four applied settings
     ===================================================================== */
  function build361(root) {
    var r = rng(361);
    function gaussPdf(x, m, s) { return Math.exp(-0.5 * Math.pow((x - m) / s, 2)) / (s * Math.sqrt(2 * Math.PI)); }

    /* populations for "The concept" */
    var shapes = {
      skew: { name: "Skewed (like wait times)", mu: 1, sigma: 1,
        draw: function () { return -Math.log(1 - r()); },
        pdf: function (x) { return x < 0 ? 0 : Math.exp(-x); } },
      uniform: { name: "Flat (uniform)", mu: 1, sigma: Math.sqrt(4 / 12),
        draw: function () { return 2 * r(); },
        pdf: function (x) { return x >= 0 && x <= 2 ? 0.5 : 0; } },
      bimodal: { name: "Two peaks", mu: 1, sigma: Math.sqrt(0.04 + 0.2025),
        draw: function () { return (r() < 0.5 ? 0.55 : 1.45) + 0.2 * normal(r); },
        pdf: function (x) { return 0.5 * gaussPdf(x, 0.55, 0.2) + 0.5 * gaussPdf(x, 1.45, 0.2); } },
      normal: { name: "Bell-shaped (normal)", mu: 1, sigma: 0.4,
        draw: function () { return 1 + 0.4 * normal(r); },
        pdf: function (x) { return gaussPdf(x, 1, 0.4); } }
    };

    /* applications: each one is the same idea with a real-world setting (all simulated) */
    var LN_MU = Math.log(5.5) - 0.125, LN_S = 0.5; // incubation periods: mean 5.5 days
    var scenarios = {
      concept: { label: "The concept", recipe: "", lo: 0, hi: 3, bins: 60, ticks: [0, 0.5, 1, 1.5, 2, 2.5, 3], dec: 3, unit: "",
        n: 30, nMin: 1, nMax: 100, nStep: 1, noun: "observations", stat: "x̄",
        popTitle: "Population", sampleTitle: "Latest sample", histTitle: "Sample means" },
      epi: { label: "Epidemiology", recipe: "Each incubation period is drawn at random from a right-skewed (lognormal) distribution with a true mean of 5.5 days and an SD of about 2.9 days. A study averages the values for its cases.", lo: 0, hi: 16, bins: 80, ticks: [0, 4, 8, 12, 16], dec: 2, unit: " days",
        n: 40, nMin: 5, nMax: 200, nStep: 5, noun: "cases", stat: "average",
        popTitle: "Incubation periods, all cases", sampleTitle: "One study", histTitle: "Averages from many studies",
        mu: 5.5, sigma: 5.5 * Math.sqrt(Math.exp(LN_S * LN_S) - 1),
        draw: function () { return Math.exp(LN_MU + LN_S * normal(r)); },
        pdf: function (x) { return x <= 0 ? 0 : Math.exp(-Math.pow(Math.log(x) - LN_MU, 2) / (2 * LN_S * LN_S)) / (x * LN_S * Math.sqrt(2 * Math.PI)); },
        band: { k: 2, label: "95% of studies" },
        heading: "How long is the incubation period?",
        story: "Epidemiologists estimate how long it takes from infection to symptoms. Individual incubation periods are skewed: most are short, a few are long. Each study averages a few dozen cases and reports a 95% confidence interval.",
        takeaway: function (se, n) { return "With " + n + " cases per study, 95% of study averages land within ±" + (2 * se).toFixed(1) + " days of the true average (5.5 days). That is why outbreak reports give a range, and why bigger studies give tighter ranges."; } },
      health: { label: "Health administration", recipe: "Each patient's wait is drawn at random from a right-skewed (exponential) distribution with a true mean of 45 minutes and an SD of 45 minutes, the same at every hospital. Each hospital-day sees between 5 and 200 patients, chosen at random.", lo: 0, hi: 160, bins: 80, ticks: [0, 40, 80, 120, 160], dec: 1, unit: " min",
        n: 50, nMin: 5, nMax: 200, nStep: 5, noun: "patients", stat: "average",
        popTitle: "ER wait times, all patients", sampleTitle: "One hospital, one day", histTitle: "Daily averages over many days",
        mu: 45, sigma: 45,
        draw: function () { return -45 * Math.log(1 - r()); },
        pdf: function (x) { return x < 0 ? 0 : Math.exp(-x / 45) / 45; },
        band: { k: 2, label: "normal range" },
        heading: "Which hospitals have unusually long ER waits?",
        story: "A health department compares the average emergency-room wait at hospitals of very different sizes. Individual waits are very skewed: many patients are seen quickly, a few wait hours. Is a hospital with a 70-minute average day really worse, or just small?",
        takeaway: function (se, n) { return "On an ordinary day, the average wait for " + n + " patients falls between " + (45 - 2 * se).toFixed(0) + " and " + (45 + 2 * se).toFixed(0) + " minutes 95% of the time. A day outside that range is worth a closer look; a day inside it is probably just chance."; } },
      quality: { label: "Quality control and reliability", recipe: "Each battery's lifetime is drawn at random from a right-skewed (gamma) distribution with a true mean of 100 hours and an SD of about 71 hours. A batch average uses the batteries tested from that batch. With the machine fault on, every lifetime is cut in half.", lo: 0, hi: 320, bins: 80, ticks: [0, 80, 160, 240, 320], dec: 1, unit: " hrs",
        n: 10, nMin: 2, nMax: 50, nStep: 1, noun: "batteries", stat: "average",
        popTitle: "Battery lifetimes, all batteries", sampleTitle: "One batch tested", histTitle: "Batch averages",
        mu: 100, sigma: 100 / Math.SQRT2,
        draw: function () { return -50 * (Math.log(1 - r()) + Math.log(1 - r())); },
        pdf: function (x) { return x < 0 ? 0 : x / 2500 * Math.exp(-x / 50); },
        band: { k: 3, label: "control limits", limits: true },
        heading: "Is this batch of batteries good?",
        story: "A factory can't test every battery to failure, so it tests a few from each batch and plots the batch averages on a control chart. Lifetimes are skewed. A batch outside the control limits gets inspected. Can the chart catch a machine that starts making bad batteries?",
        takeaway: function (se, n) { return "Testing " + n + " batteries per batch, the control limits are " + Math.max(0, 100 - 3 * se).toFixed(0) + " to " + (100 + 3 * se).toFixed(0) + " hours (3 standard errors from the mean). A good batch lands outside them only about 3 times in 1,000, so a batch outside them is a real warning sign."; } },
      poll: { label: "Election polling and demography", recipe: "Each voter in a poll supports the measure with probability 0.52, independently of everyone else, like a weighted coin flip. A poll's result is the share of its voters who support it.", lo: 0.40, hi: 0.64, bins: 60, ticks: [0.40, 0.46, 0.52, 0.58, 0.64], dec: 3, unit: "",
        n: 1000, nMin: 100, nMax: 3000, nStep: 100, noun: "voters", stat: "proportion", pct: true, discrete: true,
        popTitle: "All voters", sampleTitle: "One poll", histTitle: "Results from many polls",
        mu: 0.52, sigma: Math.sqrt(0.52 * 0.48),
        draw: function () { return r() < 0.52 ? 1 : 0; },
        band: { k: 2, label: "margin of error" },
        heading: "What does “±3 points” in a poll mean?",
        story: "In this simulated state, 52% of voters support a ballot measure. A poll asks a random sample of voters. Demographers use the same idea for survey estimates, such as average household size.",
        takeaway: function (se, n) { return "With " + n.toLocaleString() + " voters, 95% of polls land within ±" + (200 * se).toFixed(1) + " points of the true 52%. That ± is the margin of error. A poll showing 51% doesn't mean the measure is losing ground, and one showing 53% doesn't mean it's pulling ahead."; } }
    };
    var order = ["epi", "health", "quality", "poll"];

    root.innerHTML = simNote("361") +
      '<p class="explore-intro">Pick a setting, then draw samples. In every setting, averages of samples pile up around the true value, their spread shrinks as samples get bigger, and a few land far out just by chance. ' +
      'Each setting shows that the way people in the field do: confidence intervals in epidemiology, a funnel plot comparing hospitals, a control chart in a factory, and a poll tracker. Red marks the results that fall outside the expected range.</p>' +
      '<div class="btn-toolbar scen-bar" id="x361-scen" role="group" aria-label="Setting">' + order.map(function (k, i) {
        return '<button type="button" class="btn btn-default btn-sm' + (i ? "" : " active") + '" data-s="' + k + '" aria-pressed="' + (i ? "false" : "true") + '">' + scenarios[k].label + "</button>";
      }).join("") + "</div>" +
      '<div class="callout" id="x361-card"></div>' +
      '<div class="well form-inline">' +
      '  <div class="form-group" id="x361-popwrap"><label for="x361-pop">Population</label> <select id="x361-pop" class="form-control">' +
      Object.keys(shapes).map(function (k) { return '<option value="' + k + '">' + shapes[k].name + "</option>"; }).join("") +
      "  </select></div>" +
      '  <div class="form-group" id="x361-nwrap"><label for="x361-n"><span id="x361-nlab">Sample size</span> <span class="badge" id="x361-nv">30</span></label> <input type="range" id="x361-n"></div>' +
      '  <div class="form-group" id="x361-nnote" hidden><span class="ctrl-label">Hospital size:</span> each hospital-day has 5 to 200 patients</div>' +
      '  <div class="checkbox" id="x361-curvewrap"><label><input type="checkbox" id="x361-curve" checked> Show normal curve</label></div>' +
      '  <div class="checkbox" id="x361-faultwrap" hidden><label><input type="checkbox" id="x361-fault"> Machine fault: new batteries last half as long</label></div>' +
      '  <div class="btn-toolbar">' +
      '    <button type="button" class="btn btn-default" id="x361-one">Draw 1 sample</button>' +
      '    <button type="button" class="btn btn-default" id="x361-hundred">Draw 100</button>' +
      '    <button type="button" class="btn btn-default" id="x361-play">Play</button>' +
      '    <button type="button" class="btn btn-default" id="x361-reset">Reset</button>' +
      "  </div>" +
      "</div>" +
      '<div class="svg-wrap"><svg id="x361-svg" viewBox="0 0 640 420" role="img" aria-label="Population, latest sample, and histogram of sample statistics"></svg></div>' +
      '<div class="stat-row" id="x361-stats"></div>';

    var svg = root.querySelector("#x361-svg");
    var popSel = root.querySelector("#x361-pop"), nIn = root.querySelector("#x361-n"), curveBox = root.querySelector("#x361-curve"), faultBox = root.querySelector("#x361-fault");
    var playBtn = root.querySelector("#x361-play");
    var X0 = 40, X1 = 620;
    var cur = "concept", sc = scenarios.concept, means = [], samples = [], latest = null, timer = null;

    function pop() { return cur === "concept" ? shapes[popSel.value] : sc; }
    function sx(v) { return X0 + (Math.max(sc.lo, Math.min(sc.hi, v)) - sc.lo) / (sc.hi - sc.lo) * (X1 - X0); }
    function fmt(v, d) { return sc.pct ? (100 * v).toFixed(d === undefined ? 1 : d) + "%" : v.toFixed(d === undefined ? sc.dec : d) + sc.unit; }
    function tickLabel(v) { return sc.pct ? Math.round(100 * v) + "%" : String(v); }

    function drawSample() {
      var P = pop(), n = cur === "health" ? 5 + Math.floor(r() * 196) : +nIn.value, xs = [], s = 0, ss = 0;
      var fault = cur === "quality" && faultBox.checked;
      var keep = sc.discrete ? 0 : Math.min(n, 200);
      for (var i = 0; i < n; i++) { var v = P.draw(); if (fault) v *= 0.5; s += v; ss += v * v; if (i < keep) xs.push(v); }
      latest = { xs: xs, n: n, sum: s, mean: s / n, sd: n > 1 ? Math.sqrt(Math.max(0, (ss - s * s / n) / (n - 1))) : 0, fault: fault };
      means.push(latest.mean); samples.push(latest);
    }
    function title(y, txt, sub) {
      var t = svgEl("text", { x: X0, y: y, "class": "svg-title" }, svg); t.textContent = txt;
      if (sub) { var u = svgEl("tspan", { dx: 10, "class": "svg-small" }, t); u.textContent = sub; }
    }
    /* ---------- the four applied views ---------- */
    function tcrit(df) { // 97.5th percentile of t, Cornish-Fisher approximation (close enough for drawing)
      var z = 1.959964; return z + (Math.pow(z, 3) + z) / (4 * df) + (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);
    }
    function statBox(k, v, t) { return '<div><span class="stat-k">' + k + '</span><span class="stat-v">' + v + "</span>" + (t ? '<span class="stat-t">' + t + "</span>" : "") + "</div>"; }
    function yAxis(lo, hi, ticks, sy, x0, x1, fmtT) {
      ticks.forEach(function (t) {
        svgEl("line", { x1: x0, x2: x1, y1: sy(t), y2: sy(t), "class": "gridline" }, svg);
        var l = svgEl("text", { x: x0 - 6, y: sy(t) + 4, "text-anchor": "end", "class": "svg-small" }, svg); l.textContent = fmtT(t);
      });
    }
    function niceTicks(lo, hi, k) {
      var raw = (hi - lo) / k, mag = Math.pow(10, Math.floor(Math.log10(raw)));
      var st = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (x) { return x >= raw; })[0], out = [];
      for (var v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(+v.toFixed(6));
      return out;
    }
    var VIEWS361 = {
      // epidemiology: a 95% confidence interval from each study; a few miss the truth
      epi: function (P, n) {
        var rows = samples.slice(-40), top = 230, bot = 386, step = (bot - top) / 40, lo = 2.5, hi = 8.5;
        var sx3 = function (v) { return X0 + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (X1 - X0); };
        title(214, "95% confidence intervals from the latest studies", "each line is one study; red ones miss the true average");
        [3, 4, 5, 6, 7, 8].forEach(function (t) {
          svgEl("line", { x1: sx3(t), x2: sx3(t), y1: top - 2, y2: bot, "class": "gridline" }, svg);
          var l = svgEl("text", { x: sx3(t), y: bot + 16, "text-anchor": "middle", "class": "svg-small" }, svg); l.textContent = t;
        });
        var ul = svgEl("text", { x: X1, y: bot + 32, "text-anchor": "end", "class": "svg-small" }, svg); ul.textContent = "days";
        rows.forEach(function (s, i) {
          var y = top + (i + 0.5) * step, h = tcrit(s.n - 1) * s.sd / Math.sqrt(s.n), miss = s.mean - h > P.mu || s.mean + h < P.mu;
          svgEl("line", { x1: sx3(s.mean - h), x2: sx3(s.mean + h), y1: y, y2: y, "class": "ci" + (miss ? " miss" : "") }, svg);
          svgEl("circle", { cx: sx3(s.mean), cy: y, r: 1.9, "class": "ci-dot" + (miss ? " miss" : "") }, svg);
        });
        svgEl("line", { x1: sx3(P.mu), x2: sx3(P.mu), y1: top - 4, y2: bot + 4, "class": "mu" }, svg);
        var t5 = svgEl("text", { x: sx3(P.mu), y: bot + 32, "text-anchor": "middle", "class": "svg-small svg-strong" }, svg); t5.textContent = "true average: 5.5 days";
        var miss = samples.filter(function (s) { var h = tcrit(s.n - 1) * s.sd / Math.sqrt(s.n); return s.mean - h > P.mu || s.mean + h < P.mu; }).length, k = samples.length;
        var avgW = k ? samples.reduce(function (a, s) { return a + 2 * tcrit(s.n - 1) * s.sd / Math.sqrt(s.n); }, 0) / k : 0;
        return {
          stats: statBox("Studies so far", k) + statBox("Typical interval width", k ? avgW.toFixed(1) + " days" : "n/a", "shrinks as studies get bigger") +
            statBox("Intervals that miss 5.5 days", k ? miss + " of " + k + " (" + pct(miss / k) + ")" : "n/a", "expected: about 5%"),
          takeaway: "Every study reports its average with a 95% confidence interval. About 95 in 100 of those intervals capture the true 5.5 days, and about 5 in 100 miss it, just by chance. With " + n + " cases per study the intervals are about " + avgW.toFixed(1) + " days wide; bigger studies give narrower ones."
        };
      },
      // health administration: a funnel plot of hospitals of different sizes
      health: function (P) {
        var top = 228, bot = 384, lo = 10, hi = 90, NX0 = X0 + 34, NMAX = 210;
        var sxn = function (m) { return NX0 + m / NMAX * (X1 - NX0); }, sy = function (v) { return bot - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (bot - top); };
        title(214, "Funnel plot: each dot is one hospital's average wait for one day", "x = patients seen that day");
        yAxis(lo, hi, [20, 45, 70], sy, NX0, X1, function (t) { return t + " min"; });
        [0, 50, 100, 150, 200].forEach(function (m) { var l = svgEl("text", { x: sxn(m), y: bot + 16, "text-anchor": "middle", "class": "svg-small" }, svg); l.textContent = m; });
        var ul = svgEl("text", { x: X1, y: bot + 32, "text-anchor": "end", "class": "svg-small" }, svg); ul.textContent = "patients that day";
        [[2, "funnel2"], [3, "funnel3"]].forEach(function (fk) {
          [-1, 1].forEach(function (sgn) {
            var pts = [];
            for (var m = 5; m <= 200; m += 1) { var fv = P.mu + sgn * fk[0] * P.sigma / Math.sqrt(m); if (fv >= lo && fv <= hi) pts.push(sxn(m).toFixed(1) + " " + sy(fv).toFixed(1)); }
            svgEl("path", { d: "M" + pts.join("L"), "class": fk[1] }, svg);
          });
        });
        svgEl("line", { x1: NX0, x2: X1, y1: sy(P.mu), y2: sy(P.mu), "class": "mu" }, svg);
        var shown = samples.slice(-800), out2 = 0, out3 = 0, small = 0, big = 0;
        samples.forEach(function (s) { var z = Math.abs(s.mean - P.mu) / (P.sigma / Math.sqrt(s.n)); if (z > 2) out2++; if (z > 3) out3++; });
        shown.forEach(function (s) {
          var z = Math.abs(s.mean - P.mu) / (P.sigma / Math.sqrt(s.n));
          svgEl("circle", { cx: sxn(s.n), cy: sy(s.mean), r: 2.6, "class": "fdot" + (z > 3 ? " miss far" : z > 2 ? " miss" : "") }, svg);
        });
        var l2 = svgEl("text", { x: X1 - 4, y: sy(P.mu - 2 * P.sigma / Math.sqrt(200)) + 14, "text-anchor": "end", "class": "svg-small svg-strong gaplabel" }, svg); l2.textContent = "95% limits (dashed)";
        var l3 = svgEl("text", { x: X1 - 4, y: sy(P.mu + 3 * P.sigma / Math.sqrt(200)) - 7, "text-anchor": "end", "class": "svg-small svg-strong gaplabel" }, svg); l3.textContent = "99.8% limits (solid)";
        // the most extreme averages come from small hospitals
        var ext = samples.slice().sort(function (a, b) { return Math.abs(b.mean - P.mu) - Math.abs(a.mean - P.mu); }).slice(0, Math.max(1, Math.round(samples.length / 10)));
        var extSmall = ext.filter(function (s) { return s.n < 60; }).length, k = samples.length;
        return {
          stats: statBox("Hospital-days so far", k) + statBox("Outside the 95% limits", k ? out2 + " of " + k : "n/a", "expected: about 5%") +
            statBox("Most extreme 10% from small hospitals", k ? pct(extSmall / ext.length) : "n/a", "small = under 60 patients"),
          takeaway: "Every hospital here has the same true average wait, 45 minutes. Yet a few days land outside the 95% limits (red), and the most extreme days, best and worst, come mostly from small hospitals, because an average of a few patients swings more. A funnel plot judges each hospital against limits that fit its size, instead of ranking raw averages."
        };
      },
      // quality control: a control chart; turn on a machine fault and see if the limits catch it
      quality: function (P, n, se) {
        var rows = samples.slice(-50), top = 232, bot = 384, lcl = Math.max(0, P.mu - 3 * se), ucl = P.mu + 3 * se;
        var lo = Math.max(0, Math.min(P.mu - 4.5 * se, Math.min.apply(null, rows.map(function (s) { return s.mean; }).concat([P.mu])) - 5));
        var hi = Math.max(P.mu + 4.5 * se, Math.max.apply(null, rows.map(function (s) { return s.mean; }).concat([P.mu])) + 5);
        var CX0 = X0 + 34, sxb = function (i) { return CX0 + (i + 0.5) / 50 * (X1 - CX0); }, sy = function (v) { return bot - (v - lo) / (hi - lo) * (bot - top); };
        title(214, "Control chart: the latest 50 batches", "dots are batch averages; red ones fall outside the limits");
        yAxis(lo, hi, niceTicks(lo, hi, 4), sy, CX0, X1, function (t) { return t + " h"; });
        [[ucl, "upper limit"], [lcl, "lower limit"]].forEach(function (l) {
          svgEl("line", { x1: CX0, x2: X1, y1: sy(l[0]), y2: sy(l[0]), "class": "limitline" }, svg);
          var t = svgEl("text", { x: X1, y: sy(l[0]) - 5, "text-anchor": "end", "class": "svg-small svg-strong gaplabel" }, svg); t.textContent = l[1] + " " + l[0].toFixed(0) + " h";
        });
        svgEl("line", { x1: CX0, x2: X1, y1: sy(P.mu), y2: sy(P.mu), "class": "mu" }, svg);
        var firstFault = -1;
        rows.forEach(function (s, i) { if (s.fault && firstFault < 0) firstFault = i; });
        if (firstFault >= 0) {
          var fx = sxb(firstFault) - (X1 - CX0) / 100;
          svgEl("line", { x1: fx, x2: fx, y1: top - 4, y2: bot, "class": "faultline" }, svg);
          var ft = svgEl("text", { x: fx + 4, y: top + 8, "class": "svg-small svg-strong gaplabel" }, svg); ft.textContent = "machine fault starts";
        }
        svgEl("polyline", { points: rows.map(function (s, i) { return sxb(i).toFixed(1) + "," + sy(s.mean).toFixed(1); }).join(" "), "class": "runline" }, svg);
        rows.forEach(function (s, i) {
          var outL = s.mean < lcl || s.mean > ucl;
          svgEl("circle", { cx: sxb(i), cy: sy(s.mean), r: 3.6, "class": "cdot" + (outL ? " miss" : "") + (s.fault ? " faulty" : "") }, svg);
        });
        var good = samples.filter(function (s) { return !s.fault; }), bad = samples.filter(function (s) { return s.fault; });
        var fa = good.filter(function (s) { return s.mean < lcl || s.mean > ucl; }).length, caught = bad.filter(function (s) { return s.mean < lcl || s.mean > ucl; }).length;
        return {
          stats: statBox("Batches so far", samples.length) + statBox("Good batches flagged", good.length ? fa + " of " + good.length : "n/a", "expected: about 0.3% (false alarms)") +
            statBox("Faulty batches caught", bad.length ? caught + " of " + bad.length + " (" + pct(caught / bad.length) + ")" : "turn on the fault", "higher is better"),
          takeaway: "Limits 3 standard errors from 100 hours (" + lcl.toFixed(0) + " to " + ucl.toFixed(0) + " h with " + n + " batteries per batch) almost never flag a good batch. Turn on the machine fault, which halves battery life: with only 10 batteries per batch, many faulty batches slip through. Raise the sample size to 30 and nearly all of them get caught."
        };
      },
      // polling: a poll tracker with margins of error
      poll: function (P, n) {
        var rows = samples.slice(-30), top = 230, bot = 384, lo = 0.40, hi = 0.64;
        var CX0 = X0 + 30, PX1 = X1 - 74, sxp = function (i) { return CX0 + (i + 0.5) / 30 * (PX1 - CX0); }, sy = function (v) { return bot - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (bot - top); };
        title(214, "Poll tracker: the latest 30 polls", "bars show each poll's margin of error");
        yAxis(lo, hi, [0.44, 0.48, 0.52, 0.56, 0.60], sy, CX0, PX1, function (t) { return Math.round(100 * t) + "%"; });
        svgEl("line", { x1: CX0, x2: PX1, y1: sy(0.5), y2: sy(0.5), "class": "fifty" }, svg);
        var t50 = svgEl("text", { x: PX1 + 6, y: sy(0.5) + 10, "class": "svg-small svg-strong" }, svg); t50.textContent = "50%: tie";
        svgEl("line", { x1: CX0, x2: PX1, y1: sy(P.mu), y2: sy(P.mu), "class": "mu" }, svg);
        var tt = svgEl("text", { x: PX1 + 6, y: sy(P.mu) - 2, "class": "svg-small svg-strong" }, svg); tt.textContent = "true 52%";
        var ta = svgEl("text", { x: PX1 + 6, y: top + 6, "class": "svg-small" }, svg); ta.textContent = "black line:";
        var tb = svgEl("text", { x: PX1 + 6, y: top + 20, "class": "svg-small" }, svg); tb.textContent = "5-poll average";
        var avg = rows.map(function (_, i) { var a = rows.slice(Math.max(0, i - 4), i + 1); return a.reduce(function (s, x) { return s + x.mean; }, 0) / a.length; });
        rows.forEach(function (s, i) {
          var moe = 1.96 * Math.sqrt(s.mean * (1 - s.mean) / s.n), miss = Math.abs(s.mean - P.mu) > moe;
          svgEl("line", { x1: sxp(i), x2: sxp(i), y1: sy(s.mean - moe), y2: sy(s.mean + moe), "class": "pollbar" + (miss ? " miss" : "") }, svg);
          svgEl("circle", { cx: sxp(i), cy: sy(s.mean), r: 3.4, "class": "polldot" + (miss ? " miss" : "") }, svg);
        });
        if (rows.length > 1) svgEl("polyline", { points: avg.map(function (v, i) { return sxp(i).toFixed(1) + "," + sy(v).toFixed(1); }).join(" "), "class": "pollavg" }, svg);
        var k = samples.length, missAll = samples.filter(function (s) { return Math.abs(s.mean - P.mu) > 1.96 * Math.sqrt(s.mean * (1 - s.mean) / s.n); }).length;
        var losing = samples.filter(function (s) { return s.mean < 0.5; }).length;
        return {
          stats: statBox("Polls so far", k) + statBox("Margin of error", "±" + (196 * Math.sqrt(0.25 / n)).toFixed(1) + " pts", "with " + n.toLocaleString() + " voters") +
            statBox("Margins that miss 52%", k ? missAll + " of " + k : "n/a", "expected: about 5%") + statBox("Polls showing it losing", k ? losing + " of " + k : "n/a", "even though it's winning"),
          takeaway: "Each poll lands somewhere near 52%, and its margin of error (±" + (196 * Math.sqrt(0.25 / n)).toFixed(1) + " points with " + n.toLocaleString() + " voters) usually covers the truth. Single polls bounce around; the black line, an average of the last five polls, bounces much less. That's why poll averages are more trustworthy than any one poll."
        };
      }
    };
    function render() {
      var P = pop(), n = +nIn.value, se = P.sigma / Math.sqrt(n);
      root.querySelector("#x361-nv").textContent = n.toLocaleString();
      if (cur === "health" && latest) n = latest.n;
      clear(svg);

      /* 1. population */
      if (sc.discrete) {
        title(18, sc.popTitle, "52% support, 48% do not");
        var bx0 = X0, bx1 = X1, by = 50, bh = 34, split = bx0 + 0.52 * (bx1 - bx0);
        svgEl("rect", { x: bx0, y: by, width: split - bx0, height: bh, "class": "popbar-yes" }, svg);
        svgEl("rect", { x: split, y: by, width: bx1 - split, height: bh, "class": "popbar-no" }, svg);
        var ty = svgEl("text", { x: bx0 + 10, y: by + 22, "class": "svg-bar-label" }, svg); ty.textContent = "support 52%";
        var tn = svgEl("text", { x: bx1 - 10, y: by + 22, "text-anchor": "end", "class": "svg-bar-label dark" }, svg); tn.textContent = "do not 48%";
      } else {
        title(18, sc.popTitle, cur === "concept" ? "mean μ = 1, SD σ = " + P.sigma.toFixed(2) : "mean μ = " + fmt(P.mu, 1) + ", SD σ = " + fmt(P.sigma, 1));
        var pts = [], peak = 0;
        for (var i = 0; i <= 300; i++) { var x = sc.lo + (sc.hi - sc.lo) * i / 300, d = P.pdf(x); peak = Math.max(peak, d); pts.push([x, d]); }
        var ph = 72, pb = 105;
        svgEl("path", { d: "M" + sx(sc.lo) + " " + pb + pts.map(function (q) { return "L" + sx(q[0]).toFixed(1) + " " + (pb - q[1] / peak * ph).toFixed(1); }).join("") + "L" + sx(sc.hi) + " " + pb + "Z", "class": "popfill" }, svg);
        svgEl("line", { x1: X0, x2: X1, y1: pb, y2: pb, "class": "axis" }, svg);
      }

      /* 2. latest sample */
      var sb = 178;
      title(138, sc.sampleTitle, latest ? sc.noun === "observations" ? "n = " + latest.n + ", x̄ = " + latest.mean.toFixed(3)
        : latest.n.toLocaleString() + " " + sc.noun + ", " + sc.stat + " = " + fmt(latest.mean) : "draw a sample to see it");
      if (latest && sc.discrete) {
        var yes = Math.round(latest.sum), w = X1 - X0, sp = X0 + latest.mean * w;
        svgEl("rect", { x: X0, y: 148, width: sp - X0, height: 26, "class": "popbar-yes" }, svg);
        svgEl("rect", { x: sp, y: 148, width: X1 - sp, height: 26, "class": "popbar-no" }, svg);
        var a1 = svgEl("text", { x: X0 + 10, y: 166, "class": "svg-bar-label" }, svg); a1.textContent = yes.toLocaleString() + " support";
        var a2 = svgEl("text", { x: X1 - 10, y: 166, "text-anchor": "end", "class": "svg-bar-label dark" }, svg); a2.textContent = (latest.n - yes).toLocaleString() + " do not";
      } else {
        svgEl("line", { x1: X0, x2: X1, y1: sb, y2: sb, "class": "axis" }, svg);
        if (latest) {
          var jr = rng(latest.n + means.length);
          latest.xs.forEach(function (v) { svgEl("circle", { cx: sx(v), cy: sb - 6 - jr() * 22, r: 3, "class": "sampdot" }, svg); });
          svgEl("line", { x1: sx(latest.mean), x2: sx(latest.mean), y1: sb - 34, y2: sb + 2, "class": "meanmark" }, svg);
        }
      }

      /* 3. each setting shows the sampling distribution the way that field would */
      if (cur !== "concept") {
        if (!sc.discrete) svgEl("line", { x1: sx(P.mu), x2: sx(P.mu), y1: 30, y2: 182, "class": "mu" }, svg);
        var out = VIEWS361[cur](P, n, se);
        root.querySelector("#x361-stats").innerHTML = out.stats;
        root.querySelector("#x361-card").innerHTML = "<h4>" + sc.heading + "</h4><p>" + sc.story + "</p><p class=\"takeaway\"><strong>What the chart tells you:</strong> " + out.takeaway + "</p>";
        return;
      }

      /* 3. histogram of sample statistics */
      title(214, sc.histTitle, means.length + " so far");
      var hb = 385, hh = 150, NB = sc.bins, BW = (sc.hi - sc.lo) / NB;
      var counts = new Array(NB).fill(0);
      means.forEach(function (m) { var b = Math.floor((m - sc.lo) / BW); counts[Math.max(0, Math.min(NB - 1, b))]++; });
      var curvePeak = means.length * BW / (se * Math.sqrt(2 * Math.PI));
      var ymax = Math.max(5, Math.max.apply(null, counts), curveBox.checked && means.length ? curvePeak : 0) * 1.08;
      var outside = 0;
      if (sc.band) {
        var bl = P.mu - sc.band.k * se, bu = P.mu + sc.band.k * se;
        means.forEach(function (m) { if (m < bl || m > bu) outside++; });
        if (sc.band.limits) {
          [bl, bu].forEach(function (v, i) {
            svgEl("line", { x1: sx(v), x2: sx(v), y1: hb - hh + 14, y2: hb, "class": "limitline" }, svg);
            var t = svgEl("text", { x: sx(v), y: hb - hh + 8, "text-anchor": "middle", "class": "svg-small svg-strong gaplabel" }, svg);
            t.textContent = (i ? "upper" : "lower") + " limit";
          });
        } else {
          svgEl("rect", { x: sx(bl), y: hb - hh - 4, width: sx(bu) - sx(bl), height: hh + 4, "class": "bandrect" }, svg);
          var bt = svgEl("text", { x: (sx(bl) + sx(bu)) / 2, y: hb - hh + 10, "text-anchor": "middle", "class": "svg-small svg-strong gaplabel" }, svg);
          bt.textContent = sc.band.label + " (±" + (sc.pct ? (100 * sc.band.k * se).toFixed(1) + " pts" : fmt(sc.band.k * se, 1)) + ")";
        }
      }
      counts.forEach(function (c, b) {
        if (!c) return;
        var h = c / ymax * hh;
        svgEl("rect", { x: sx(sc.lo + b * BW) + 0.5, y: hb - h, width: Math.max(1, (X1 - X0) / NB - 1), height: h, "class": "histbar" }, svg);
      });
      if (curveBox.checked && means.length) {
        var cp = [];
        for (var j = 0; j <= 300; j++) {
          var xv = sc.lo + (sc.hi - sc.lo) * j / 300, dv = means.length * BW * gaussPdf(xv, P.mu, se);
          if (dv / ymax * hh > 0.3) cp.push(sx(xv).toFixed(1) + " " + (hb - dv / ymax * hh).toFixed(1));
        }
        if (cp.length) svgEl("path", { d: "M" + cp.join("L"), "class": "normcurve" }, svg);
      }
      svgEl("line", { x1: X0, x2: X1, y1: hb, y2: hb, "class": "axis" }, svg);
      svgEl("line", { x1: sx(P.mu), x2: sx(P.mu), y1: sc.discrete ? 214 : 30, y2: hb, "class": "mu" }, svg);
      sc.ticks.forEach(function (t) {
        var lab = svgEl("text", { x: sx(t), y: hb + 18, "text-anchor": "middle", "class": "svg-small" }, svg);
        lab.textContent = tickLabel(t);
      });
      if (sc.unit) { var ul = svgEl("text", { x: X1, y: hb + 34, "text-anchor": "end", "class": "svg-small" }, svg); ul.textContent = sc.unit.trim(); }

      /* stats and setting card */
      var k = means.length, m = 0, sd = 0;
      if (k) m = means.reduce(function (a, b) { return a + b; }, 0) / k;
      if (k > 1) sd = Math.sqrt(means.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (k - 1));
      var what = cur === "concept" ? "x&#772;'s" : sc.stat === "proportion" ? "poll results" : sc.stat + "s";
      var boxes = '<div><span class="stat-k">Samples drawn</span><span class="stat-v">' + k + "</span></div>" +
        '<div><span class="stat-k">Average of the ' + what + '</span><span class="stat-v">' + (k ? fmt(m) : "n/a") + '</span><span class="stat-t">target: ' + (cur === "concept" ? "μ = 1" : fmt(P.mu, 1)) + "</span></div>" +
        '<div><span class="stat-k">SD of the ' + what + ' (standard error)</span><span class="stat-v">' + (k > 1 ? fmt(sd) : "n/a") + '</span><span class="stat-t">target: σ/√n = ' + fmt(se) + "</span></div>";
      if (sc.band) boxes += '<div><span class="stat-k">Outside the ' + sc.band.label + '</span><span class="stat-v">' + (k ? outside + " of " + k : "n/a") +
        '</span><span class="stat-t">expected: about ' + (sc.band.k === 3 ? "0.3%" : "5%") + "</span></div>";
      root.querySelector("#x361-stats").innerHTML = boxes;
      root.querySelector("#x361-card").innerHTML = cur === "concept"
        ? "<h4>The concept: sampling distributions</h4><p>Try <em>n</em> = 1, then 5, then 50. The averages start out looking like the population, then narrow and turn bell-shaped, even when the population is skewed or has two peaks. The four settings above put this same idea to work.</p>"
        : "<h4>" + sc.heading + "</h4><p>" + sc.story + "</p><p class=\"takeaway\"><strong>What the histogram tells you:</strong> " + sc.takeaway(se, n) + "</p>";
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "Play"; playBtn.classList.remove("active"); } }
    // the opening view of each setting always includes a few outliers: results that land outside the expected range by chance
    var OUTLIERS = {
      epi: function (P) { return samples.slice(-40).filter(function (s) { var h = tcrit(s.n - 1) * s.sd / Math.sqrt(s.n); return s.mean - h > P.mu || s.mean + h < P.mu; }).length >= 2; },
      health: function (P) { return samples.filter(function (s) { return Math.abs(s.mean - P.mu) / (P.sigma / Math.sqrt(s.n)) > 2; }).length >= 4; },
      quality: function (P) { var se = P.sigma / Math.sqrt(+nIn.value); return samples.slice(-50).filter(function (s) { return Math.abs(s.mean - P.mu) > 3 * se; }).length >= 1; },
      poll: function (P) { return samples.slice(-30).filter(function (s) { return Math.abs(s.mean - P.mu) > 1.96 * Math.sqrt(s.mean * (1 - s.mean) / s.n); }).length >= 2; }
    };
    var SEED0 = { epi: 3610, health: 3620, quality: 3630, poll: 3640 };
    function reset(prefill) {
      stop(); means = []; samples = []; latest = null;
      if (prefill) {
        for (var seed = SEED0[cur] || 361, tries = 0; tries < 200; seed++, tries++) {
          r = rng(seed); means = []; samples = [];
          for (var i = 0; i < 100; i++) drawSample();
          if (!OUTLIERS[cur] || OUTLIERS[cur](pop())) break;
        }
      }
      render();
    }
    function setScenario(key) {
      cur = key; sc = scenarios[key];
      root.querySelectorAll("#x361-scen button").forEach(function (b) {
        var on = b.getAttribute("data-s") === key; b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on));
      });
      root.querySelector("#x361-popwrap").hidden = true;
      root.querySelector("#x361-curvewrap").hidden = true;
      root.querySelector("#x361-faultwrap").hidden = key !== "quality";
      root.querySelector("#x361-nwrap").hidden = key === "health";
      root.querySelector("#x361-nnote").hidden = key !== "health";
      faultBox.checked = false;
      root.querySelector("#x361-nlab").textContent = "Sample size (" + sc.noun + ")";
      nIn.min = sc.nMin; nIn.max = sc.nMax; nIn.step = sc.nStep; nIn.value = sc.n;
      writeRecipe();
      reset(true);
    }

    root.querySelector("#x361-one").addEventListener("click", function () { drawSample(); render(); });
    root.querySelector("#x361-hundred").addEventListener("click", function () { for (var i = 0; i < 100; i++) drawSample(); render(); });
    root.querySelector("#x361-reset").addEventListener("click", function () { reset(false); });
    playBtn.addEventListener("click", function () {
      if (timer) { stop(); return; }
      playBtn.textContent = "Pause"; playBtn.classList.add("active");
      timer = setInterval(function () { drawSample(); render(); if (means.length >= 3000) stop(); }, 120);
    });
    root.querySelectorAll("#x361-scen button").forEach(function (b) { b.addEventListener("click", function () { setScenario(b.getAttribute("data-s")); }); });
    popSel.addEventListener("change", function () { writeRecipe(); reset(false); });
    function writeRecipe() {
      var first = cur === "concept"
        ? "Each value is drawn at random by the computer's random number generator from the population shown: " + shapes[popSel.value].name.toLowerCase() + ", with a true mean of 1."
        : sc.recipe;
      root.querySelector("#x361-recipe").innerHTML = "<ul><li>" + first + "</li>" +
        "<li>" + (cur === "health" ? "Each hospital-day takes as many patients as that hospital saw, then records their average wait." : "Each sample takes as many values as the sample-size slider says, then records the average (or the share, for polls).") + "</li>" +
        "<li>The panel starts with 100 samples already drawn; <em>Draw</em> and <em>Play</em> add more. Because we set the true values, you can compare every result with the truth.</li></ul>";
    }
    nIn.addEventListener("input", function () { reset(false); });
    curveBox.addEventListener("change", render);
    setScenario("epi");
    return { setScenario: setScenario };
  }

  /* =====================================================================
     MTH 391: one data set, five views, four settings
     ===================================================================== */
  function build391(root) {
    /* ---------- one fictional city, four settings (all simulated) ---------- */
    function hn(i, k) { var x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); } // repeatable noise
    /* ---------- Riverton's geography (invented): one city, mapped four different ways ---------- */
    var RIVER = [[0, 27], [14, 30], [28, 38], [42, 51], [56, 56], [70, 59], [85, 64], [100, 72]];
    var HIGHWAY = [[81, 0], [79, 40], [75, 100]];
    function riverY(x) {
      for (var i = 0; i < RIVER.length - 1; i++) { var a = RIVER[i], b = RIVER[i + 1]; if (x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
      return RIVER[RIVER.length - 1][1];
    }
    // six neighborhoods; the river splits north from south
    var HOODS = [
      { name: "Northgate", pop: 18000, lab: [17, 8], poly: [[0, 0], [40, 0], [40, 20], [32, 24], [28, 38], [14, 30], [0, 27]] },
      { name: "Downtown", pop: 26000, lab: [47, 24.5], poly: [[32, 24], [40, 20], [66, 20], [66, 58.1], [56, 56], [42, 51], [28, 38]] },
      { name: "Eastside", pop: 21000, lab: [91, 44], poly: [[40, 0], [100, 0], [100, 72], [85, 64], [70, 59], [66, 58.1], [66, 20], [40, 20]] },
      { name: "Westside", pop: 15000, lab: [15, 58], poly: [[0, 27], [14, 30], [28, 38], [30, 39.9], [30, 100], [0, 100]] },
      { name: "Riverside", pop: 17000, lab: [47, 69], poly: [[30, 39.9], [42, 51], [56, 56], [62, 57.3], [56, 75], [30, 75]] },
      { name: "Southpark", pop: 23000, lab: [44, 93], poly: [[30, 75], [56, 75], [62, 57.3], [70, 59], [85, 64], [100, 72], [100, 100], [30, 100]] }
    ];
    function inPoly(p, poly) {
      var c = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var a = poly[i], b = poly[j];
        if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
      }
      return c;
    }
    function hoodOf(p) { for (var k = 0; k < HOODS.length; k++) if (inPoly(p, HOODS[k].poly)) return k; return 0; }
    // streets: named arterials, plus a light grid downtown and in the south
    var ROADS = [
      { name: "Main St", pts: [[0, 20], [100, 20]], lab: [8, 19] },
      { name: "Broadway", pts: [[50, 0], [50, 100]], lab: [51, 4] },
      { name: "Union Ave", pts: [[62, 20], [62, 100]], lab: [63, 68] },
      { name: "River Rd", pts: [[0, 23], [14, 26], [28, 34], [42, 47], [56, 52], [70, 55], [85, 60], [100, 68]], lab: null },
      { name: "Oak Ave", pts: [[30, 75], [100, 75]], lab: [88, 74] },
      { name: "Hill Rd", pts: [[0, 52], [12, 55], [22, 64], [26, 80], [24, 100]], lab: [4, 51] }
    ];
    var BRIDGES = [[50, riverY(50)], [62, riverY(62)], [79.3, riverY(79.3)]];
    var MINOR = (function () {
      var s = [], x, y;
      for (x = 36; x <= 64; x += 4) s.push([[x, 20], [x, riverY(x) - 4.5]]);                                   // downtown avenues
      for (y = 24; y <= 44; y += 4) { var xa = 34; while (riverY(xa) - 4.5 < y && xa < 66) xa += 0.5; if (xa < 66) s.push([[xa, y], [66, y]]); }
      for (x = 34; x <= 74; x += 6) s.push([[x, riverY(x) + 4], [x, 98]]);                                       // southern blocks
      for (y = 64; y <= 96; y += 6) { var xb = 74; while (riverY(xb) + 4 > y && xb > 30) xb -= 0.5; if (xb > 32) s.push([[32, y], [xb, y]]); }
      return s;
    })();
    var BIKE_LANES = [ROADS[3].pts, [[50, 0], [50, 100]], [[20, 20], [82, 20]]];
    var PARKS = [{ name: "Riverfront Park", c: [37, 45.5], r: [4.5, 2.6] }, { name: "Ridge Park", c: [9, 74], r: [5, 5] }, { name: "Union Green", c: [57, 30], r: [2.6, 3] }];
    // elevation (m) for the topographic map: a river valley, western hills, a low port to the east
    function g2(x, y, cx, cy, sx, sy) { return Math.exp(-(Math.pow(x - cx, 2) / (2 * sx * sx) + Math.pow(y - cy, 2) / (2 * sy * sy))); }
    function riverDist(x, y) {
      var best = Infinity;
      for (var i = 0; i < RIVER.length - 1; i++) {
        var a = RIVER[i], b = RIVER[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
        var t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
        best = Math.min(best, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
      }
      return best;
    }
    function elev(x, y) {
      return Math.max(3, 8 + 2.2 * riverDist(x, y) + 230 * g2(x, y, 10, 72, 13, 17) + 150 * g2(x, y, 18, 6, 15, 9) +
        55 * g2(x, y, 92, 14, 11, 12) - 30 * g2(x, y, 96, 76, 10, 10));
    }
    var TOPO = null, PEAK = null; // contour segments and the ridge top, computed the first time the topographic map is drawn
    function topo() {
      if (TOPO) return TOPO;
      var N = 64, v = [], i, j;
      for (j = 0; j <= N; j++) { v.push([]); for (i = 0; i <= N; i++) v[j].push(elev(100 * i / N, 100 * j / N)); }
      PEAK = [0, 0, 0];
      for (j = 0; j <= N; j++) for (i = 0; i <= N; i++) if (v[j][i] > PEAK[0]) PEAK = [v[j][i], 100 * i / N, 100 * j / N];
      TOPO = [];
      for (var L = 25; L <= 300; L += 25) {
        var segs = [];
        for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
          var a = v[j][i], b = v[j][i + 1], c = v[j + 1][i + 1], dd = v[j + 1][i];
          var idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (dd > L ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          var x0 = 100 * i / N, y0 = 100 * j / N, s = 100 / N;
          var E = {
            t: [x0 + s * (L - a) / (b - a), y0], r: [x0 + s, y0 + s * (L - b) / (c - b)],
            b: [x0 + s * (L - dd) / (c - dd), y0 + s], l: [x0, y0 + s * (L - a) / (dd - a)]
          };
          var cases = { 1: ["l", "b"], 2: ["b", "r"], 3: ["l", "r"], 4: ["t", "r"], 5: ["l", "t", "b", "r"], 6: ["t", "b"], 7: ["l", "t"],
            8: ["l", "t"], 9: ["t", "b"], 10: ["t", "r", "l", "b"], 11: ["t", "r"], 12: ["l", "r"], 13: ["b", "r"], 14: ["l", "b"] }[idx];
          for (var k = 0; k < cases.length; k += 2) segs.push([E[cases[k]], E[cases[k + 1]]]);
        }
        TOPO.push({ level: L, segs: segs });
      }
      return TOPO;
    }
    var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var MSTART = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
    function dow(t) { return (t + 3) % 7; } // day 0 = Thursday, Jan 1
    function g(x, m, s) { return Math.exp(-Math.pow(x - m, 2) / (2 * s * s)); }
    function hourLabel(h) { h = h % 24; return h === 0 ? "12a" : h < 12 ? h + "a" : h === 12 ? "12p" : (h - 12) + "p"; }
    function range(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; }
    function dateLabel(t) { var m = 0; while (m < 11 && MSTART[m + 1] <= t) m++; return MONTHS[m] + " " + (t - MSTART[m] + 1); }

    /* variable-type generators */
    function pick(rr, levels, probs) { var u = rr(), a = 0; for (var i = 0; i < levels.length; i++) { a += probs[i]; if (u < a) return levels[i]; } return levels[levels.length - 1]; }
    function lognorm(rr, med, s, lo, hi) { return Math.max(lo, Math.min(hi, med * Math.exp(s * normal(rr)))); }
    function poisson(rr, lam) { var L = Math.exp(-lam), k = 0, p = 1; do { k++; p *= rr(); } while (p > L); return k - 1; }

    var S = {
      transport: {
        recipe: "Daily trips = a seasonal wave that peaks in mid-July, × 0.78 on weekends, × 0.55 on rainy days (more of them in winter), × 1.6 on Bike to Work Day, plus up to ±8% random noise. The hourly pattern has commute peaks at 8 AM and 5:30 PM on weekdays and a broad early-afternoon peak on weekends.",
        label: "Transportation and urban planning", unit: "trips", agg: "sum", fmtV: function (v) { return Math.round(v).toLocaleString() + " trips"; },
        heading: "Where and when do people ride the bike share?",
        story: "Riverton's bike-share system logs every trip: where it started, where it ended, and when. One year of trips can answer very different questions depending on how you plot it.",
        names: ["Central Station", "Union Square", "Riverfront Park", "University", "Northgate", "Westside Library", "Eastside Market", "Stadium", "Old Mill", "Southpark", "Harbor", "Hillcrest"],
        values: [5200, 4800, 4100, 4500, 1900, 1500, 2300, 2000, 2600, 1700, 1200, 900],
        siteNoun: "station", edgeNoun: "trips between them", recordNoun: "trips",
        base: "streets", hoodLabel: "neighborhood totals",
        mapTitle: "Street map: each circle is a station (bigger means more trips); green dashes are bike lanes",
        hoodTitle: "Trips by neighborhood; darker means more",
        pos: [[48, 38], [56, 45], [40, 47], [63, 29], [25, 15], [13, 46], [84, 22], [77, 50], [33, 70], [57, 81], [86, 80], [18, 86]],
        edges: [[0, 1, 900], [0, 3, 820], [1, 3, 420], [1, 2, 640], [0, 2, 560], [3, 4, 380], [1, 7, 350], [2, 8, 480], [0, 6, 300], [3, 6, 260], [8, 9, 240], [5, 2, 200], [9, 10, 150], [4, 0, 280], [11, 8, 110], [7, 10, 130]],
        heat: { rows: DAYS, days: true, cols: range(6, 22), colLab: hourLabel, colUnit: "hour", title: "Average trips per hour, by weekday and hour",
          f: function (r, h) { return r < 5 ? 20 + 160 * g(h, 8, 1) + 140 * g(h, 17.5, 1.2) + 40 * g(h, 12.5, 1.3) : 15 + 120 * g(h, 13.5, 2.8) + (r === 5 ? 10 : 0); } },
        series: { title: "Trips per day", unitShort: "trips", ev: [134, "Bike to Work Day"],
          f: function (t) {
            var v = 2300 + 1300 * Math.sin(2 * Math.PI * (t - 105) / 365);
            if (dow(t) >= 5) v *= 0.78;
            if (hn(t, 1) < 0.10 + 0.10 * (1 + Math.cos(2 * Math.PI * t / 365))) v *= 0.55;
            if (t === 134) v *= 1.6;
            return v * (1 + 0.16 * (hn(t, 2) - 0.5));
          } },
        vars: {
          nominal: { name: "Rider type", levels: ["Member", "Casual", "Day pass", "Student"], gen: function (rr) { return pick(rr, this.levels, [0.52, 0.28, 0.12, 0.08]); } },
          ordinal: { name: "Trip length", levels: ["Under 10 min", "10–20 min", "20–40 min", "Over 40 min"], gen: function (rr) { return pick(rr, this.levels, [0.34, 0.36, 0.21, 0.09]); } },
          discrete: { name: "Bikes checked out together", unit: "bikes", gen: function (rr) { return pick(rr, [1, 2, 3, 4, 5, 6], [0.68, 0.19, 0.07, 0.03, 0.02, 0.01]); }, groups: [1, 2] },
          continuous: { name: "Trip duration", unit: "min", dec: 0, gen: function (rr) { return lognorm(rr, 14, 0.6, 1, 120); }, bins: [1, 2, 5, 10, 20] }
        },
        notes: {
          bars: "Central Station and Union Square are the busiest stations. Outlying stations like Hillcrest see a fraction of the riders.",
          heat: "Weekday peaks at 8 AM and 5 to 6 PM show commuting. On weekends, riding peaks in the early afternoon instead.",
          map: "Busy stations cluster downtown, where the bike lanes meet the river trail. The southwest has few stations and no bike lanes, a gap a city planner might fill.",
          hoods: "Adding up each neighborhood's stations gives a coarser picture: Downtown dominates. It shows which areas stand out but hides the differences between stations inside each neighborhood.",
          network: "Most trips stay inside the downtown triangle of Central Station, Union Square, and University.",
          series: "Riding climbs from winter to a summer peak, drops on rainy days, and jumps on Bike to Work Day."
        }
      },
      health: {
        recipe: "Daily cases = a winter outbreak that peaks in late January plus a smaller rise in December, × 0.55 on weekends (fewer clinic visits), plus up to ±15% random noise. In the weekly heatmap, each neighborhood's outbreak peaks one to two weeks after the one before it, starting in Riverside.",
        label: "Public health", unit: "cases", agg: "sum", fmtV: function (v) { return Math.round(v).toLocaleString() + " cases"; },
        heading: "Where is a flu outbreak spreading, and how fast?",
        story: "Twelve clinics report cases of flu-like illness to the health department. Mapping the reports and tracking them over time shows where an outbreak started and where it's headed.",
        names: ["Downtown Clinic", "Union Health Center", "Riverfront Clinic", "University Health", "Northgate Clinic", "Westside Clinic", "Eastside Clinic", "Stadium Urgent Care", "Old Mill Clinic", "Southpark Clinic", "Harbor Clinic", "Hillcrest Clinic"],
        values: [220, 200, 260, 150, 120, 160, 150, 140, 640, 520, 160, 250],
        siteNoun: "clinic", edgeNoun: "patients seen at both", recordNoun: "patients",
        base: "choropleth", hoodRate: true, hoodLabel: "neighborhood rates",
        mapTitle: "Shading: cases per 1,000 residents; circles: cases reported at each clinic",
        hoodTitle: "Cases per 1,000 residents, by neighborhood",
        pos: [[46, 34], [58, 40], [44, 58], [62, 26], [20, 12], [12, 50], [86, 30], [74, 48], [38, 66], [60, 84], [88, 86], [16, 82]],
        edges: [[8, 9, 60], [8, 2, 55], [8, 11, 48], [9, 11, 40], [2, 0, 35], [0, 1, 30], [9, 10, 22], [2, 5, 25], [0, 3, 18], [1, 7, 15], [4, 0, 12], [6, 7, 14]],
        heat: { rows: ["Riverside", "Southpark", "Downtown", "Westside", "Eastside", "Northgate"], days: false, cols: range(1, 20), colLab: function (w) { return "wk " + w; }, colUnit: "week",
          title: "Cases per week, by neighborhood",
          f: function (r, w) { var peak = [6, 8, 9, 10, 11, 12][r], amp = [55, 48, 40, 30, 28, 22][r]; return 2 + amp * g(w, peak, 2.2); } },
        series: { title: "Cases reported per day", unitShort: "cases", ev: [28, "season peak"],
          f: function (t) {
            var v = 6 + 50 * g(t, 28, 16) + 30 * g(t, 348, 11);
            if (dow(t) >= 5) v *= 0.55;
            return v * (1 + 0.3 * (hn(t, 3) - 0.5));
          } },
        vars: {
          nominal: { name: "Main symptom", levels: ["Fever", "Cough", "Sore throat", "Body aches"], gen: function (rr) { return pick(rr, this.levels, [0.30, 0.32, 0.20, 0.18]); } },
          ordinal: { name: "Severity", levels: ["Mild", "Moderate", "Severe", "Critical"], gen: function (rr) { return pick(rr, this.levels, [0.55, 0.30, 0.12, 0.03]); } },
          discrete: { name: "Days since symptoms began", unit: "days", gen: function (rr) { return Math.min(14, poisson(rr, 2.6)); }, groups: [1, 2, 3] },
          continuous: { name: "Body temperature", unit: "°F", dec: 1, gen: function (rr) { return Math.max(97, Math.min(105, 100.4 + 1.1 * normal(rr))); }, bins: [0.1, 0.2, 0.5, 1, 2] }
        },
        notes: {
          bars: "Old Mill and Southpark clinics report the most cases this season.",
          heat: "The outbreak starts in Riverside and reaches Northgate about six weeks later. Read down the rows to watch it spread.",
          map: "Riverside, around the Old Mill and Riverfront clinics, has by far the highest rate, and the neighborhoods next to it come next: the center of the outbreak. A map makes a cluster obvious in a way a table of numbers doesn't.",
          hoods: "Rates per 1,000 residents make neighborhoods of different sizes fair to compare. Riverside's rate is about eight times Northgate's. Raw case counts would favor the biggest neighborhoods instead.",
          network: "Clinics inside the cluster share many patients, one way an illness moves between neighborhoods.",
          series: "Cases peak in late January and rise again in December. Reports dip every weekend because clinics see fewer patients, not because there's less illness."
        }
      },
      env: {
        recipe: "Daily PM2.5 = a seasonal wave that's higher in winter, plus a weekday traffic bump, plus a wildfire-smoke spike lasting about ten days in early August, with up to ±17% random noise. The hourly pattern has rush-hour peaks on weekdays.",
        label: "Environmental science", unit: "µg/m³", agg: "mean", fmtV: function (v) { return v.toFixed(1) + " µg/m³"; },
        heading: "Where and when is the air dirtiest?",
        story: "Twelve sensors measure fine-particle pollution (PM2.5) every hour. Averages, maps, and daily patterns each point to a different source.",
        names: ["Downtown", "City Hall", "Riverfront", "University", "Northgate", "Westside", "Highway 5 North", "Highway 5 Central", "Old Mill", "Southpark", "Port", "Hillcrest"],
        values: [11.6, 10.9, 10.2, 9.0, 6.2, 5.9, 13.6, 15.8, 9.1, 7.6, 16.5, 4.8],
        siteNoun: "sensor", edgeNoun: "how closely their daily readings move together (r × 100)", recordNoun: "hourly readings",
        base: "topo", hoodLabel: "neighborhood averages",
        mapTitle: "Topographic map: lines show elevation; each circle is a sensor (bigger means dirtier air)",
        hoodTitle: "Average PM2.5 by neighborhood",
        pos: [[46, 40], [54, 33], [40, 48], [62, 24], [22, 9], [9, 44], [80, 17], [77.5, 46], [34, 64], [56, 86], [95, 71], [15, 66]],
        edges: [[6, 7, 92], [7, 10, 90], [6, 10, 85], [0, 1, 88], [0, 7, 70], [1, 3, 75], [2, 8, 72], [8, 9, 74], [4, 5, 68], [5, 11, 66], [9, 11, 60], [3, 6, 58]],
        heat: { rows: DAYS, days: true, cols: range(0, 23), colLab: hourLabel, colUnit: "hour", title: "Average PM2.5 by weekday and hour",
          f: function (r, h) { var rush = r < 5 ? 6 * g(h, 8, 1.4) + 5 * g(h, 18, 1.8) : 1.5 * g(h, 12, 3); return 7 + rush + (h < 5 ? 2 : 0); } },
        series: { title: "Daily average PM2.5", unitShort: "µg/m³", ev: [217, "wildfire smoke"],
          f: function (t) {
            var v = 8 + 2.5 * Math.cos(2 * Math.PI * t / 365) + (dow(t) < 5 ? 1.2 : 0) + 38 * g(t, 217, 3);
            return v * (1 + 0.35 * (hn(t, 4) - 0.5));
          } },
        vars: {
          nominal: { name: "Sensor setting", levels: ["Roadside", "Residential", "Industrial", "Park"], gen: function (rr) { return pick(rr, this.levels, [0.35, 0.30, 0.20, 0.15]); } },
          ordinal: { name: "Air quality category", levels: ["Good", "Moderate", "Sensitive groups", "Unhealthy", "Very unhealthy"], gen: function (rr) { return pick(rr, this.levels, [0.55, 0.30, 0.10, 0.04, 0.01]); } },
          discrete: { name: "High-pollution hours in a day", unit: "hours", gen: function (rr) { return Math.min(24, Math.floor(-3.2 * Math.log(1 - rr()))); }, groups: [1, 2, 4] },
          continuous: { name: "PM2.5 reading", unit: "µg/m³", dec: 1, gen: function (rr) { return lognorm(rr, 8, 0.55, 0.5, 60); }, bins: [0.5, 1, 2, 5, 10] }
        },
        notes: {
          bars: "Sensors at the Port and along Highway 5 read highest; the hills in the west read lowest.",
          heat: "Pollution rises with the weekday rush hours and barely moves on weekends, a sign that traffic is a main source.",
          map: "Lines show elevation every 25 m (thicker every 100 m). The cleanest air is up on the western ridge. The dirtiest is down low: along Highway 5, at the port, and on the valley floor, where still air on cold mornings traps pollution near the ground.",
          hoods: "Eastside, with the highway, averages highest, and hilly Westside averages lowest. But averaging hides things: the single dirtiest sensor, at the port, sits in Southpark, where a cleaner residential sensor pulls the average down.",
          network: "The highway and port sensors rise and fall together. When one reads high, the others usually do too.",
          series: "Levels run higher in winter, but the worst days of the year came from a wildfire smoke event in August that a yearly average would hide."
        }
      },
      retail: {
        recipe: "Daily sales = a gentle seasonal wave × a weekly pattern (Saturdays × 1.35) × spikes before July 4th, Thanksgiving, and Christmas, plus up to ±8% random noise. The hourly pattern has lunch and after-work peaks on weekdays and a midday peak on weekends.",
        label: "Business and retail", unit: "$k", agg: "sum", fmtV: function (v) { return "$" + (v / 1000).toFixed(1) + "M"; },
        heading: "Which stores, days, and hours drive sales?",
        story: "A grocery chain has twelve stores across Riverton. Sales records, loyalty-card visits, and foot-traffic counters feed decisions about staffing, promotions, and where to open next.",
        names: ["Downtown", "Union Square", "Riverfront", "University", "Northgate", "Westside", "Eastside", "Stadium", "Old Mill", "Southpark", "Harbor", "Hillcrest"],
        values: [4800, 4300, 2900, 3900, 3600, 2100, 3200, 1800, 2500, 2300, 1500, 1300],
        siteNoun: "store", edgeNoun: "loyalty-card shoppers who use both", recordNoun: "purchases",
        base: "trade", hoodLabel: "neighborhood totals",
        mapTitle: "Trade areas: each shaded area is closer to its store than to any other; darker means more sales",
        hoodTitle: "Sales by neighborhood; darker means more",
        pos: [[47, 36], [57, 42], [36, 45], [63, 25], [24, 12], [11, 50], [88, 28], [76, 52], [35, 68], [58, 86], [90, 85], [17, 88]],
        edges: [[0, 1, 820], [0, 3, 610], [1, 7, 300], [3, 4, 520], [4, 5, 280], [0, 2, 450], [2, 8, 390], [8, 9, 330], [6, 7, 260], [6, 1, 240], [9, 10, 180], [11, 8, 150]],
        heat: { rows: DAYS, days: true, cols: range(7, 22), colLab: hourLabel, colUnit: "hour", title: "Average shoppers per hour, by weekday and hour",
          f: function (r, h) { return r < 5 ? 30 + 60 * g(h, 12.3, 0.9) + 85 * g(h, 17.5, 1.3) + (r === 4 ? 15 : 0) : 40 + (r === 5 ? 110 : 85) * g(h, 12.5, 2.6); } },
        series: { title: "Sales per day ($ thousands)", unitShort: "$k", ev: [328, "day before Thanksgiving"],
          f: function (t) {
            var v = (12 + 1.5 * Math.sin(2 * Math.PI * (t - 150) / 365)) * [1.0, 0.95, 0.97, 1.02, 1.12, 1.35, 1.05][dow(t)];
            if (t === 328) v *= 1.9; if (t === 356) v *= 1.8; if (t === 183) v *= 1.35;
            return v * (1 + 0.16 * (hn(t, 5) - 0.5));
          } },
        vars: {
          nominal: { name: "Payment method", levels: ["Card", "Mobile", "Cash", "Gift card"], gen: function (rr) { return pick(rr, this.levels, [0.50, 0.25, 0.15, 0.10]); } },
          ordinal: { name: "Customer rating", levels: ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"], gen: function (rr) { return pick(rr, this.levels, [0.05, 0.07, 0.15, 0.33, 0.40]); } },
          discrete: { name: "Items in basket", unit: "items", gen: function (rr) { return Math.round(lognorm(rr, 8, 0.6, 1, 45)); }, groups: [1, 2, 5] },
          continuous: { name: "Amount spent", unit: "$", dec: 2, gen: function (rr) { return lognorm(rr, 32, 0.65, 1, 300); }, bins: [2, 5, 10, 25, 50] }
        },
        notes: {
          bars: "Downtown and Union Square sell the most; Hillcrest and Harbor the least.",
          heat: "Saturdays around midday are busiest, and weekday traffic spikes at lunch and after work. That's useful for scheduling staff.",
          map: "Each shaded area is a store's trade area: the part of town closer to it than to any other store. Downtown's stores split small, busy areas, while Hillcrest and Westside cover large areas with low sales. The southwest may be underserved, a possible place to grow.",
          hoods: "Neighborhood totals put Downtown far ahead, partly because it has the most stores. Totals answer \"where are the sales?\" but not \"which stores are doing well?\"",
          network: "Many shoppers use both the Downtown and Union Square stores, so a promotion at one may pull customers from the other.",
          series: "Sales follow a weekly rhythm with Saturday highs. The year's biggest spikes come right before Thanksgiving and Christmas."
        }
      }
    };
    var ORDER = ["transport", "health", "env", "retail"];
    var TYPES = ["nominal", "ordinal", "discrete", "continuous"];
    var TYPE_INFO = {
      nominal: { group: "Categorical", label: "Nominal", note: "Categories with no built-in order. Any order works, so sorting by count makes the biggest groups easy to compare." },
      ordinal: { group: "Categorical", label: "Ordinal", note: "Categories with a natural order. Keep that order in the chart: sorting by count scrambles the story." },
      discrete: { group: "Numerical", label: "Discrete", note: "Counts you can list: 0, 1, 2, and so on. One bar per value works, and the gaps between values are real." },
      continuous: { group: "Numerical", label: "Continuous", note: "Measurements that can take any value in a range. You have to group them into bins, and the bin width changes what you see." }
    };
    // ~1,500 simulated records per setting, one value of each variable type per record
    ORDER.forEach(function (k, si) {
      var rr = rng(3910 + si), V = S[k].vars;
      TYPES.forEach(function (ty) { V[ty].data = []; for (var i = 0; i < 1500; i++) V[ty].data.push(V[ty].gen(rr)); });
    });
    // daily values for each setting, computed once
    ORDER.forEach(function (k) { var d = S[k]; d.daily = []; for (var t = 0; t < 365; t++) d.daily.push(d.series.f(t)); });

    var VIEWS = [["bars", "Bar chart"], ["heat", "Heatmap"], ["map", "Map"], ["network", "Network"], ["series", "Time series"], ["vars", "Variable types"]];

    root.innerHTML = simNote("391") +
      '<p class="explore-intro">The same data set can answer very different questions depending on how you look at it. ' +
      'Pick a setting, then switch between views of one year of data from the fictional city of Riverton. ' +
      'Each view has its own controls: play the year as an animation, change how finely the data is grouped, filter the network, ' +
      'or compare the four types of variables. Click a location in the bar chart, map, or network to follow it across views.</p>' +
      '<div class="btn-toolbar scen-bar" id="x391-scen" role="group" aria-label="Setting">' + ORDER.map(function (k, i) {
        return '<button type="button" class="btn btn-default btn-sm' + (i ? "" : " active") + '" data-s="' + k + '" aria-pressed="' + (i ? "false" : "true") + '">' + S[k].label + "</button>";
      }).join("") + "</div>" +
      '<div class="callout" id="x391-card"></div>' +
      '<ul class="nav-tabs view-tabs" role="tablist" id="x391-tabs">' + VIEWS.map(function (v, i) {
        return '<li><button type="button" role="tab" data-v="' + v[0] + '" aria-selected="' + (i ? "false" : "true") + '"' + (i ? "" : ' class="active"') + ">" + v[1] + "</button></li>";
      }).join("") + "</ul>" +
      '<div class="view-pane">' +
      '  <h4 id="x391-vtitle"></h4>' +
      '  <div class="well view-ctrl" id="x391-ctrl"></div>' +
      '  <div class="svg-wrap"><svg id="x391-svg" viewBox="0 0 640 380" role="img" aria-label="Selected view of the data"></svg></div>' +
      '  <p class="view-note" id="x391-note"></p>' +
      '  <p class="view-sel" id="x391-sel"></p>' +
      "</div>";

    var svg = root.querySelector("#x391-svg"), ctrl = root.querySelector("#x391-ctrl");
    var cur = "transport", view = "bars", sel = null;
    // per-view settings
    var opt = { hbin: 1, rowGroup: "each", mapRes: "sites", mapLinks: false, minW: 0, layout: "circle", sizeBy: "total",
      res: "day", smooth: 7, playT: 364, playing: null, vtype: "nominal", sortNom: "count", keepOrder: true, dgroup: 0, cbin: 2, rug: true };
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function text(x, y, s, cls, anchor, parent) { var t = svgEl("text", { x: x, y: y, "class": cls || "svg-small", "text-anchor": anchor || "start" }, parent || svg); t.textContent = s; return t; }
    function neighbors(i) {
      return S[cur].edges.filter(function (e) { return e[0] === i || e[1] === i; })
        .map(function (e) { return [e[0] === i ? e[1] : e[0], e[2]]; }).sort(function (a, b) { return b[1] - a[1]; });
    }
    function selectSite(i) { sel = sel === i ? null : i; draw(); }
    function clickable(parent, i, label) {
      var gEl = svgEl("g", { "class": "clickable" + (sel === i ? " is-sel" : "") + (sel !== null && sel !== i ? " is-dim" : ""), tabindex: 0, role: "button", "aria-label": label }, parent);
      gEl.addEventListener("click", function () { selectSite(i); });
      gEl.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selectSite(i); } });
      return gEl;
    }
    function stopPlay() { if (opt.playing) { clearInterval(opt.playing); opt.playing = null; } var b = root.querySelector("#x391-play"); if (b) b.textContent = opt.playT >= 364 ? "Play the year" : "Play"; }

    /* ---------------- controls for each view (rebuilt when the view or setting changes) ---------------- */
    function radios(name, label, choices, value) {
      return '<div class="ctrl-item"><span class="ctrl-label">' + label + "</span> " + choices.map(function (c) {
        return '<label class="inline-radio"><input type="radio" name="' + name + '" value="' + c[0] + '"' + (String(value) === String(c[0]) ? " checked" : "") + "> " + c[1] + "</label>";
      }).join(" ") + "</div>";
    }
    function buildControls() {
      stopPlay();
      var d = S[cur], h = "";
      if (view === "bars") {
        h = '<div class="ctrl-item ctrl-hint">Click a bar to select that ' + d.siteNoun + ".</div>";
      } else if (view === "heat") {
        h = '<div class="ctrl-item"><label for="x391-hbin" class="ctrl-label">Resolution: one block = <b id="x391-hbinv"></b></label> ' +
          '<input type="range" id="x391-hbin" min="1" max="4" step="1" value="' + opt.hbin + '"></div>';
        if (d.heat.days) h += radios("x391-rows", "Rows:", [["each", "each day"], ["weekpart", "weekdays vs. weekend"]], opt.rowGroup);
        h += '<div class="ctrl-item ctrl-hint">Coarser blocks are easier to read but can hide short peaks.</div>';
      } else if (view === "map") {
        h = radios("x391-mapres", "Show:", [["sites", "each " + d.siteNoun], ["hoods", d.hoodLabel]], opt.mapRes) +
          '<div class="ctrl-item"><label><input type="checkbox" id="x391-maplinks"' + (opt.mapLinks ? " checked" : "") + "> Draw the network's links on the map</label></div>";
      } else if (view === "network") {
        var maxw = Math.max.apply(null, d.edges.map(function (e) { return e[2]; }));
        if (opt.minW > maxw) opt.minW = 0;
        h = '<div class="ctrl-item"><label for="x391-minw" class="ctrl-label">Hide links weaker than <b id="x391-minwv"></b></label> ' +
          '<input type="range" id="x391-minw" min="0" max="' + maxw + '" step="' + [1, 2, 5, 10, 20, 25, 50, 100].filter(function (x) { return x >= maxw / 50; })[0] + '" value="' + opt.minW + '"></div>' +
          radios("x391-layout", "Layout:", [["circle", "circle"], ["map", "on the map"]], opt.layout) +
          radios("x391-size", "Circle size:", [["total", "total"], ["degree", "number of links"]], opt.sizeBy);
      } else if (view === "series") {
        h = '<div class="ctrl-item"><button type="button" class="btn" id="x391-play">' + (opt.playT >= 364 ? "Play the year" : "Play") + "</button> " +
          '<span id="x391-date" class="ctrl-readout"></span></div>' +
          radios("x391-res", "Resolution:", [["day", "daily"], ["week", "weekly"], ["month", "monthly"]], opt.res) +
          '<div class="ctrl-item" id="x391-smoothwrap"><label for="x391-smooth" class="ctrl-label">Smoothing: average over <b id="x391-smoothv"></b></label> ' +
          '<input type="range" id="x391-smooth" min="1" max="31" step="2" value="' + opt.smooth + '"></div>';
      } else if (view === "vars") {
        var V = d.vars;
        var cell = function (ty) {
          return '<td><button type="button" class="typecell' + (opt.vtype === ty ? " active" : "") + '" data-ty="' + ty + '" aria-pressed="' + (opt.vtype === ty) + '">' +
            "<b>" + TYPE_INFO[ty].label + "</b><span>" + V[ty].name + "</span></button></td>";
        };
        h = '<table class="typegrid" aria-label="Choose a variable by type"><tr><th>Categorical</th><th>Numerical</th></tr>' +
          "<tr>" + ["nominal", "discrete"].map(cell).join("") + "</tr>" +
          "<tr>" + ["ordinal", "continuous"].map(cell).join("") + "</tr></table>" +
          '<div id="x391-varctrl"></div>';
      }
      ctrl.innerHTML = h;
      ctrl.hidden = !h;
      wireControls();
      if (view === "vars") buildVarControls();
    }
    function buildVarControls() {
      var v = S[cur].vars[opt.vtype], h = "";
      if (opt.vtype === "nominal") h = radios("x391-sortnom", "Order the bars:", [["count", "by count"], ["az", "A to Z"]], opt.sortNom);
      else if (opt.vtype === "ordinal") h = '<div class="ctrl-item"><label><input type="checkbox" id="x391-keep"' + (opt.keepOrder ? " checked" : "") + "> Keep the natural order</label></div>";
      else if (opt.vtype === "discrete") h = radios("x391-dgroup", "Group values:", v.groups.map(function (gv, i) { return [i, gv === 1 ? "one bar per value" : "by " + gv + "s"]; }), Math.min(opt.dgroup, v.groups.length - 1));
      else h = '<div class="ctrl-item"><label for="x391-cbin" class="ctrl-label">Bin width: <b id="x391-cbinv"></b></label> ' +
        '<input type="range" id="x391-cbin" min="0" max="' + (v.bins.length - 1) + '" step="1" value="' + Math.min(opt.cbin, v.bins.length - 1) + '"></div>' +
        '<div class="ctrl-item"><label><input type="checkbox" id="x391-rug"' + (opt.rug ? " checked" : "") + "> Show individual values</label></div>";
      root.querySelector("#x391-varctrl").innerHTML = h;
      wireControls();
    }
    function wireControls() {
      function on(sel_, ev, fn) { root.querySelectorAll(sel_).forEach(function (el) { if (!el._wired) { el._wired = true; el.addEventListener(ev, fn); } }); }
      on("#x391-hbin", "input", function (e) { opt.hbin = +e.target.value; draw(); });
      on('input[name="x391-rows"]', "change", function (e) { opt.rowGroup = e.target.value; draw(); });
      on('input[name="x391-mapres"]', "change", function (e) { opt.mapRes = e.target.value; draw(); });
      on("#x391-maplinks", "change", function (e) { opt.mapLinks = e.target.checked; draw(); });
      on("#x391-minw", "input", function (e) { opt.minW = +e.target.value; draw(); });
      on('input[name="x391-layout"]', "change", function (e) { opt.layout = e.target.value; draw(); });
      on('input[name="x391-size"]', "change", function (e) { opt.sizeBy = e.target.value; draw(); });
      on('input[name="x391-res"]', "change", function (e) { opt.res = e.target.value; draw(); });
      on("#x391-smooth", "input", function (e) { opt.smooth = +e.target.value; draw(); });
      on("#x391-play", "click", function () {
        if (opt.playing) { stopPlay(); return; }
        if (opt.playT >= 364) opt.playT = 0;
        root.querySelector("#x391-play").textContent = "Pause";
        if (reduceMotion) { opt.playT = 364; stopPlay(); draw(); return; }
        opt.playing = setInterval(function () {
          opt.playT = Math.min(364, opt.playT + 2);
          draw();
          if (opt.playT >= 364) stopPlay();
        }, 40);
      });
      on(".typecell", "click", function (e) {
        var b = e.currentTarget; opt.vtype = b.getAttribute("data-ty");
        root.querySelectorAll(".typecell").forEach(function (o) { o.classList.toggle("active", o === b); o.setAttribute("aria-pressed", String(o === b)); });
        buildVarControls(); draw();
      });
      on('input[name="x391-sortnom"]', "change", function (e) { opt.sortNom = e.target.value; draw(); });
      on("#x391-keep", "change", function (e) { opt.keepOrder = e.target.checked; draw(); });
      on('input[name="x391-dgroup"]', "change", function (e) { opt.dgroup = +e.target.value; draw(); });
      on("#x391-cbin", "input", function (e) { opt.cbin = +e.target.value; draw(); });
      on("#x391-rug", "change", function (e) { opt.rug = e.target.checked; draw(); });
    }

    /* ---------------- views ---------------- */
    function drawBars(d) {
      var idx = d.values.map(function (_, i) { return i; }).sort(function (a, b) { return d.values[b] - d.values[a]; });
      var max = Math.max.apply(null, d.values), X0 = 170, X1 = 540, rowH = 29;
      idx.forEach(function (i, k) {
        var y = 14 + k * rowH, w = d.values[i] / max * (X1 - X0);
        var gEl = clickable(svg, i, d.names[i]);
        text(X0 - 8, y + 16, d.names[i], "svg-label", "end", gEl);
        svgEl("rect", { x: X0, y: y + 3, width: w, height: 19, "class": "vbar" }, gEl);
        text(X0 + w + 6, y + 16, d.fmtV(d.values[i]), "svg-small svg-strong", "start", gEl);
      });
      return d.notes.bars;
    }
    function drawHeat(d) {
      var H = d.heat, bw = opt.hbin;
      var cols = []; for (var c = 0; c < H.cols.length; c += bw) cols.push(H.cols.slice(c, c + bw));
      var rowsIdx = H.rows.map(function (_, r) { return [r]; }), rowLabels = H.rows.slice();
      if (H.days && opt.rowGroup === "weekpart") { rowsIdx = [[0, 1, 2, 3, 4], [5, 6]]; rowLabels = ["Weekdays", "Weekend"]; }
      var vals = rowsIdx.map(function (rs) {
        return cols.map(function (cs) { var s = 0, n = 0; rs.forEach(function (r) { cs.forEach(function (cc) { s += H.f(r, cc); n++; }); }); return s / n; });
      });
      var lo = Infinity, hi = -Infinity;
      vals.forEach(function (row) { row.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); }); });
      var nr = vals.length, nc = cols.length, X0 = 100, X1 = 620, Y0 = 10, cw = (X1 - X0) / nc, ch = Math.min(nr <= 2 ? 70 : 38, 290 / nr);
      vals.forEach(function (row, r) {
        text(X0 - 8, Y0 + r * ch + ch / 2 + 4, rowLabels[r], "svg-label", "end");
        row.forEach(function (v, k) {
          var cell = svgEl("rect", { x: X0 + k * cw + 1, y: Y0 + r * ch + 1, width: cw - 2, height: ch - 2, "class": "heatcell", "fill-opacity": (0.06 + 0.94 * (v - lo) / ((hi - lo) || 1)).toFixed(3) }, svg);
          var cs = cols[k], lab = cs.length > 1 ? H.colLab(cs[0]) + "–" + H.colLab(cs[cs.length - 1] + (H.colUnit === "hour" ? 1 : 0)) : H.colLab(cs[0]);
          var tt = svgEl("title", {}, cell); tt.textContent = rowLabels[r] + ", " + lab + ": " + (v < 20 ? v.toFixed(1) : Math.round(v));
        });
      });
      var step = Math.max(1, Math.ceil(nc / 8));
      cols.forEach(function (cs, k) { if (k % step === 0) text(X0 + k * cw + cw / 2, Y0 + nr * ch + 16, H.colLab(cs[0]), "svg-small", "middle"); });
      var ly = Y0 + nr * ch + 36;
      text(X0, ly + 10, "less", "svg-small", "start");
      for (var i = 0; i < 6; i++) svgEl("rect", { x: X0 + 34 + i * 26, y: ly, width: 24, height: 12, "class": "heatcell", "fill-opacity": (0.06 + 0.94 * i / 5).toFixed(2) }, svg);
      text(X0 + 34 + 6 * 26 + 6, ly + 10, "more", "svg-small", "start");
      var v = root.querySelector("#x391-hbinv");
      if (v) v.textContent = bw + " " + H.colUnit + (bw > 1 ? "s" : "");
      var extra = bw >= 3 ? " At this coarse resolution, short peaks blur into their neighbors." : "";
      if (H.days && opt.rowGroup === "weekpart") extra += " Grouping the days makes the weekday-versus-weekend contrast stand out.";
      return d.notes.heat + extra;
    }
    function mx(x) { return 30 + x * 5.8; } function my(y) { return 8 + y * 3.6; }
    function ptsOf(arr) { return arr.map(function (p) { return mx(p[0]).toFixed(1) + "," + my(p[1]).toFixed(1); }).join(" "); }
    function pxPoly(poly) { return poly.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
    // each setting's neighborhood value: totals, averages, or (health) a rate per 1,000 residents
    function hoodValues(d) {
      var tot = HOODS.map(function () { return 0; }), cnt = HOODS.map(function () { return 0; });
      d.values.forEach(function (v, i) { var k = hoodOf(d.pos[i]); tot[k] += v; cnt[k]++; });
      return tot.map(function (t, k) {
        if (d.hoodRate) return 1000 * t / HOODS[k].pop;
        return d.agg === "mean" ? (cnt[k] ? t / cnt[k] : null) : t;
      });
    }
    function fmtHood(d, v) { return v === null ? "no " + d.siteNoun : d.hoodRate ? v.toFixed(1) + " per 1,000" : (d.agg === "mean" ? "avg " : "") + d.fmtV(v); }
    function drawRoads(minorToo, faint) {
      if (minorToo) MINOR.forEach(function (s) { svgEl("polyline", { points: ptsOf(s), "class": "street" }, svg); });
      ROADS.forEach(function (r) { svgEl("polyline", { points: ptsOf(r.pts), "class": "road-case" + (faint ? " faint" : "") }, svg); });
      ROADS.forEach(function (r) { svgEl("polyline", { points: ptsOf(r.pts), "class": "road" + (faint ? " faint" : "") }, svg); });
    }
    function drawRiverAndHighway(labels) {
      svgEl("polyline", { points: ptsOf(RIVER), "class": "river" }, svg);
      BRIDGES.forEach(function (b) { svgEl("line", { x1: mx(b[0]) - 4, y1: my(b[1]) - 7, x2: mx(b[0]) - 4, y2: my(b[1]) + 7, "class": "bridge" }, svg); svgEl("line", { x1: mx(b[0]) + 4, y1: my(b[1]) - 7, x2: mx(b[0]) + 4, y2: my(b[1]) + 7, "class": "bridge" }, svg); });
      svgEl("polyline", { points: ptsOf(HIGHWAY), "class": "highway" }, svg);
      if (labels) { text(mx(76.5), my(96), "Hwy 5", "svg-small gaplabel", "end"); text(mx(3), my(24.5), "Rose River", "svg-small river-lab gaplabel", "start"); }
    }
    function drawHoodLines() { HOODS.forEach(function (h) { svgEl("polygon", { points: ptsOf(h.poly), "class": "hoodline" }, svg); }); }
    function drawHoodNames() { HOODS.forEach(function (h) { text(mx(h.lab[0]), my(h.lab[1]), h.name.toUpperCase(), "hood gaplabel", "middle"); }); }
    function drawChoropleth(d, light) {
      var hv = hoodValues(d), hmax = Math.max.apply(null, hv.filter(function (v) { return v !== null; }));
      HOODS.forEach(function (h, k) {
        var op = hv[k] === null ? 0.03 : 0.08 + 0.62 * hv[k] / hmax;
        svgEl("polygon", { points: ptsOf(h.poly), "class": "choro", "fill-opacity": (light ? op * 0.6 : op).toFixed(2) }, svg);
      });
      return hv;
    }
    // trade areas: the part of the map closer to each store than to any other (computed on screen)
    function tradeAreas(d) {
      var P = d.pos.map(function (p) { return [mx(p[0]), my(p[1])]; });
      return P.map(function (pi, i) {
        var poly = [[mx(0), my(0)], [mx(100), my(0)], [mx(100), my(100)], [mx(0), my(100)]];
        P.forEach(function (pj, j) {
          if (j === i || !poly.length) return;
          var ax = 2 * (pj[0] - pi[0]), ay = 2 * (pj[1] - pi[1]), c = pj[0] * pj[0] + pj[1] * pj[1] - pi[0] * pi[0] - pi[1] * pi[1], out = [];
          poly.forEach(function (A, m) {
            var B = poly[(m + 1) % poly.length], ain = ax * A[0] + ay * A[1] <= c, bin = ax * B[0] + ay * B[1] <= c;
            if (ain) out.push(A);
            if (ain !== bin) { var t = (c - ax * A[0] - ay * A[1]) / (ax * (B[0] - A[0]) + ay * (B[1] - A[1])); out.push([A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])]); }
          });
          poly = out;
        });
        return poly;
      });
    }
    // the base map is different for each setting
    function drawBase(d, light) {
      svgEl("rect", { x: mx(0), y: my(0), width: mx(100) - mx(0), height: my(100) - my(0), "class": "mapland" }, svg);
      if (d.base === "streets") {
        PARKS.forEach(function (p) { svgEl("ellipse", { cx: mx(p.c[0]), cy: my(p.c[1]), rx: p.r[0] * 5.8, ry: p.r[1] * 3.6, "class": "park" }, svg); });
        drawRoads(true, light);
        drawRiverAndHighway(!light);
        if (!light) {
          BIKE_LANES.forEach(function (b) { svgEl("polyline", { points: ptsOf(b), "class": "bikelane" }, svg); });
          drawHoodLines();
          ROADS.forEach(function (r) { if (r.lab) text(mx(r.lab[0]), my(r.lab[1]), r.name, "road-lab gaplabel", "start"); });
          text(mx(9), my(74) + 3, "Ridge Park", "park-lab gaplabel", "middle");
          drawHoodNames();
        }
      } else if (d.base === "choropleth") {
        drawChoropleth(d, light);
        drawRoads(false, true);
        drawRiverAndHighway(!light);
        if (!light) drawHoodNames();
      } else if (d.base === "topo") {
        topo().forEach(function (lv) {
          var idx = lv.level % 100 === 0;
          var path = lv.segs.map(function (s) { return "M" + mx(s[0][0]).toFixed(1) + " " + my(s[0][1]).toFixed(1) + "L" + mx(s[1][0]).toFixed(1) + " " + my(s[1][1]).toFixed(1); }).join("");
          svgEl("path", { d: path, "class": "contour" + (idx ? " index" : "") }, svg);
        });
        svgEl("rect", { x: mx(90), y: my(64), width: mx(100) - mx(90), height: my(78) - my(64), "class": "port" }, svg);
        drawRiverAndHighway(!light);
        if (!light) {
          // label a few contour lines where they pass closest to chosen spots
          [[100, 4, 56], [200, 5, 64], [100, 30, 8], [50, 96, 6]].forEach(function (l) {
            var lv = TOPO.filter(function (t) { return t.level === l[0]; })[0], best = null, bd = Infinity;
            lv.segs.forEach(function (sg) { var cx = (sg[0][0] + sg[1][0]) / 2, cy = (sg[0][1] + sg[1][1]) / 2, dd = Math.pow(cx - l[1], 2) + Math.pow(cy - l[2], 2); if (dd < bd) { bd = dd; best = [cx, cy]; } });
            if (best) text(mx(best[0]), my(best[1]) + 3, l[0] + " m", "contour-lab gaplabel", "middle");
          });
          svgEl("path", { d: "M" + mx(PEAK[1]) + " " + (my(PEAK[2]) - 6) + "l5 9h-10z", "class": "peak" }, svg);
          text(mx(PEAK[1]), my(PEAK[2]) + 16, "Ridge " + Math.round(PEAK[0] / 10) * 10 + " m", "contour-lab gaplabel", "middle");
          text(mx(95), my(80) + 4, "PORT", "hood gaplabel", "middle");
          text(mx(46), my(60) + 2, "valley floor", "contour-lab gaplabel", "middle");
        }
      } else if (d.base === "trade") {
        var cells = tradeAreas(d), max = Math.max.apply(null, d.values);
        cells.forEach(function (poly, i) {
          var op = 0.08 + 0.6 * d.values[i] / max;
          svgEl("polygon", { points: pxPoly(poly), "class": "trade" + (sel === i ? " is-selcell" : ""), "fill-opacity": (light ? op * 0.6 : op).toFixed(2) }, svg);
        });
        drawRoads(false, true);
        drawRiverAndHighway(!light);
      }
    }
    function edgeWidth(d, w) { var maxw = Math.max.apply(null, d.edges.map(function (e) { return e[2]; })); return 1 + 9 * w / maxw; }
    function drawMap(d) {
      if (opt.mapRes === "hoods") {
        svgEl("rect", { x: mx(0), y: my(0), width: mx(100) - mx(0), height: my(100) - my(0), "class": "mapland" }, svg);
        var hv = drawChoropleth(d, false);
        drawRoads(false, true);
        drawRiverAndHighway(true);
        HOODS.forEach(function (h, k) {
          text(mx(h.lab[0]), my(h.lab[1]), h.name, "svg-small svg-strong gaplabel", "middle");
          text(mx(h.lab[0]), my(h.lab[1]) + 13, fmtHood(d, hv[k]), "svg-small gaplabel", "middle");
        });
        return d.notes.hoods;
      }
      drawBase(d, false);
      if (opt.mapLinks) {
        d.edges.forEach(function (e) {
          var p = d.pos[e[0]], q = d.pos[e[1]], on = sel === null || e[0] === sel || e[1] === sel;
          svgEl("line", { x1: mx(p[0]), y1: my(p[1]), x2: mx(q[0]), y2: my(q[1]), "class": "edge" + (on ? "" : " is-dim") + (sel !== null && on ? " is-hot" : ""), "stroke-width": edgeWidth(d, e[2]).toFixed(1) }, svg);
        });
      }
      var max = Math.max.apply(null, d.values);
      var top = d.values.map(function (_, i) { return i; }).sort(function (a, b) { return d.values[b] - d.values[a]; }).slice(0, 3);
      d.pos.forEach(function (p, i) {
        var rr = d.base === "trade" ? 5 : 5 + 14 * Math.sqrt(d.values[i] / max);
        var gEl = clickable(svg, i, d.names[i] + ", " + d.fmtV(d.values[i]));
        svgEl("circle", { cx: mx(p[0]), cy: my(p[1]), r: rr, "class": "site" + (d.base === "choropleth" ? " site-ring" : ""), "fill-opacity": d.base === "trade" ? 1 : (0.45 + 0.5 * d.values[i] / max).toFixed(2) }, gEl);
        var tt = svgEl("title", {}, gEl); tt.textContent = d.names[i] + ": " + d.fmtV(d.values[i]);
        if (top.indexOf(i) >= 0 || sel === i) text(mx(p[0]), my(p[1]) - rr - 5, d.names[i], "svg-small svg-strong gaplabel", "middle", gEl);
      });
      return d.notes.map + (opt.mapLinks ? " With the links drawn on the map, you can see that most connections are between nearby " + d.siteNoun + "s." : "");
    }
    function drawNetwork(d) {
      var n = d.pos.length, cx = 320, cy = 186, R = 138;
      var deg = d.pos.map(function () { return 0; });
      var shown = d.edges.filter(function (e) { return e[2] >= opt.minW; });
      shown.forEach(function (e) { deg[e[0]]++; deg[e[1]]++; });
      var at = opt.layout === "map"
        ? function (i) { return [mx(d.pos[i][0]), my(d.pos[i][1]), null]; }
        : function (i) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; return [cx + R * Math.cos(a), cy + R * Math.sin(a), a]; };
      if (opt.layout === "map") drawBase(d, true);
      var maxv = Math.max.apply(null, d.values), maxdeg = Math.max(1, Math.max.apply(null, deg));
      shown.slice().sort(function (a, b) { return a[2] - b[2]; }).forEach(function (e) {
        var p = at(e[0]), q = at(e[1]), on = sel === null || e[0] === sel || e[1] === sel;
        var ln = svgEl("line", { x1: p[0], y1: p[1], x2: q[0], y2: q[1], "class": "edge" + (on ? "" : " is-dim") + (sel !== null && on ? " is-hot" : ""), "stroke-width": edgeWidth(d, e[2]).toFixed(1) }, svg);
        var tt = svgEl("title", {}, ln); tt.textContent = d.names[e[0]] + " – " + d.names[e[1]] + ": " + e[2].toLocaleString();
      });
      d.pos.forEach(function (_, i) {
        var p = at(i), share = opt.sizeBy === "degree" ? deg[i] / maxdeg : Math.sqrt(d.values[i] / maxv), rr = 4 + 12 * share;
        var gEl = clickable(svg, i, d.names[i]);
        if (sel !== null && sel !== i && neighbors(sel).some(function (nb) { return nb[0] === i && nb[1] >= opt.minW; })) gEl.classList.remove("is-dim");
        svgEl("circle", { cx: p[0], cy: p[1], r: rr, "class": "site" + (deg[i] === 0 ? " isolated" : "") }, gEl);
        if (p[2] !== null) {
          var lx = cx + (R + rr + 8) * Math.cos(p[2]), ly = cy + (R + rr + 8) * Math.sin(p[2]) + 4;
          var anchor = Math.abs(Math.cos(p[2])) < 0.2 ? "middle" : Math.cos(p[2]) > 0 ? "start" : "end";
          text(lx, ly, d.names[i], "svg-label", anchor, gEl);
        } else if (sel === i || deg[i] >= 3) text(p[0], p[1] - rr - 5, d.names[i], "svg-small svg-strong gaplabel", "middle", gEl);
      });
      var v = root.querySelector("#x391-minwv"); if (v) v.textContent = opt.minW.toLocaleString();
      var isolated = deg.filter(function (x) { return x === 0; }).length;
      return (opt.minW > 0 ? "Showing " + shown.length + " of " + d.edges.length + " links. " + (isolated ? isolated + " " + d.siteNoun + (isolated > 1 ? "s are" : " is") + " left with no links at this cutoff. " : "") : "") +
        d.notes.network + (opt.sizeBy === "degree" ? " Sized by number of links, well-connected " + d.siteNoun + "s stand out even if they aren't the busiest." : "");
    }
    function drawSeries(d) {
      var X0 = 62, X1 = 625, Y0 = 18, Y1 = 330, T = opt.playT;
      var daily = d.daily, agg = d.agg;
      // aggregate to the chosen resolution: [startDay, endDay, value]
      var pts = [];
      if (opt.res === "day") daily.forEach(function (v, t) { pts.push([t, t, v]); });
      else {
        var bounds = opt.res === "week" ? range(0, 52).map(function (w) { return [w * 7, Math.min(364, w * 7 + 6)]; }) : MSTART.slice(0, 12).map(function (m, k) { return [m, MSTART[k + 1] - 1]; });
        bounds.forEach(function (b) { if (b[0] > 364) return; var s = 0, n = 0; for (var t = b[0]; t <= b[1]; t++) { s += daily[t]; n++; } pts.push([b[0], b[1], agg === "mean" ? s / n : s]); });
      }
      var hi = Math.max.apply(null, pts.map(function (p) { return p[2]; })) * 1.08;
      var sx = function (t) { return X0 + t / 364 * (X1 - X0); }, sy = function (v) { return Y1 - v / hi * (Y1 - Y0); };
      [0, 0.5, 1].forEach(function (f) {
        var v = hi * f / 1.08;
        svgEl("line", { x1: X0, x2: X1, y1: sy(v), y2: sy(v), "class": "gridline" }, svg);
        text(X0 - 6, sy(v) + 4, v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(v < 10 ? 1 : 0), "svg-small", "end");
      });
      MONTHS.forEach(function (m, k) { text(sx(MSTART[k] + 14), Y1 + 18, m, "svg-small", "middle"); });
      var visible = pts.filter(function (p) { return p[0] <= T; });
      if (opt.res === "day") {
        svgEl("polyline", { points: visible.map(function (p) { return sx(p[0]).toFixed(1) + "," + sy(p[2]).toFixed(1); }).join(" "), "class": "series-raw" }, svg);
        if (opt.smooth > 1) {
          var hw = (opt.smooth - 1) / 2;
          var avg = visible.map(function (p) { var a = Math.max(0, p[0] - hw), b = Math.min(T, 364, p[0] + hw), s = 0; for (var k = a; k <= b; k++) s += daily[k]; return [p[0], s / (b - a + 1)]; });
          svgEl("polyline", { points: avg.map(function (p) { return sx(p[0]).toFixed(1) + "," + sy(p[1]).toFixed(1); }).join(" "), "class": "series-avg" }, svg);
        }
      } else {
        visible.forEach(function (p) {
          var x0 = sx(p[0]) + 1, x1 = sx(Math.min(p[1] + 1, 364)) - 1;
          svgEl("rect", { x: x0, y: sy(p[2]), width: Math.max(1, x1 - x0), height: Y1 - sy(p[2]), "class": "tsbar" }, svg);
        });
      }
      svgEl("line", { x1: X0, x2: X1, y1: Y1, y2: Y1, "class": "axis" }, svg);
      var ev = d.series.ev;
      if (T >= ev[0]) {
        var ex = sx(ev[0]);
        svgEl("line", { x1: ex, x2: ex, y1: Y0, y2: Y1, "class": "mu" }, svg);
        text(ex + (ev[0] > 300 ? -6 : 6), Y0 + 12, ev[1], "svg-small svg-strong gaplabel", ev[0] > 300 ? "end" : "start");
      }
      if (T < 364 || opt.playing) {
        var cxp = sx(T);
        svgEl("line", { x1: cxp, x2: cxp, y1: Y0, y2: Y1, "class": "cursor-line" }, svg);
        svgEl("circle", { cx: cxp, cy: sy(opt.res === "day" ? daily[T] : (visible.length ? visible[visible.length - 1][2] : 0)), r: 4.5, "class": "tsdot" }, svg);
      }
      var dl = root.querySelector("#x391-date");
      if (dl) dl.textContent = (T < 364 || opt.playing) ? dateLabel(T) + ": " + (opt.res === "day" ? fmtSeries(d, daily[T]) + " that day" : "") : "";
      var sw = root.querySelector("#x391-smoothwrap"); if (sw) sw.hidden = opt.res !== "day";
      var smv = root.querySelector("#x391-smoothv"); if (smv) smv.textContent = opt.smooth === 1 ? "1 day (no smoothing)" : opt.smooth + " days";
      var resNote = opt.res === "day" ? (opt.smooth >= 21 ? " Heavy smoothing shows the season clearly but flattens one-day events." : "")
        : opt.res === "week" ? " Weekly " + (agg === "mean" ? "averages" : "totals") + " remove the day-to-day wiggle, including the weekly rhythm."
        : " Monthly " + (agg === "mean" ? "averages" : "totals") + " show only the big seasonal pattern; single-day events almost disappear.";
      return d.notes.series + resNote;
    }
    function fmtSeries(d, v) { return d.agg === "mean" ? v.toFixed(1) + " " + d.series.unitShort : (v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1)) + " " + d.series.unitShort; }

    function drawVars(d) {
      var ty = opt.vtype, v = d.vars[ty], data = v.data, n = data.length, X0 = 90, X1 = 620, Y0 = 16, Y1 = 300;
      var info = TYPE_INFO[ty];
      var bars = [], note = "";
      if (ty === "nominal" || ty === "ordinal") {
        bars = v.levels.map(function (l) { return { label: l, n: data.filter(function (x) { return x === l; }).length }; });
        if ((ty === "nominal" && opt.sortNom === "count") || (ty === "ordinal" && !opt.keepOrder)) bars.sort(function (a, b) { return b.n - a.n; });
        if (ty === "nominal" && opt.sortNom === "az") bars.sort(function (a, b) { return a.label < b.label ? -1 : 1; });
        var mode = bars.slice().sort(function (a, b) { return b.n - a.n; })[0];
        note = "Most common: " + mode.label + " (" + Math.round(100 * mode.n / n) + "%). " + v.levels.length + " categories.";
        if (ty === "ordinal" && !opt.keepOrder) note += " Sorted by count, the categories are out of order, so the chart no longer shows how " + d.recordNoun + " spread from low to high.";
      } else if (ty === "discrete") {
        var gw = v.groups[Math.min(opt.dgroup, v.groups.length - 1)];
        var lo = Math.min.apply(null, data), hi = Math.max.apply(null, data);
        for (var a = lo; a <= hi; a += gw) {
          var b = a + gw - 1;
          bars.push({ label: gw === 1 ? String(a) : a + "–" + b, n: data.filter(function (x) { return x >= a && x <= b; }).length });
        }
        note = numSummary(data, v, 1);
      } else {
        var w = v.bins[Math.min(opt.cbin, v.bins.length - 1)];
        var lo2 = Math.floor(Math.min.apply(null, data) / w) * w, hi2 = Math.max.apply(null, data);
        for (var c = lo2; c <= hi2; c += w) {
          var c2 = c + w;
          bars.push({ x0: c, x1: c2, n: data.filter(function (x) { return x >= c && x < c2; }).length });
        }
        var bv = root.querySelector("#x391-cbinv");
        if (bv) bv.textContent = (v.unit === "$" ? "$" + w : w + " " + v.unit) + " (" + bars.length + " bins)";
        note = numSummary(data, v, 0) + (bars.length > 60 ? " With this many narrow bins the histogram turns jagged: random noise looks like a pattern." : bars.length < 8 ? " With so few wide bins, the shape of the data is hidden." : "");
      }
      var maxn = Math.max.apply(null, bars.map(function (b) { return b.n; }));
      var sy = function (k) { return Y1 - k / maxn * (Y1 - Y0); };
      [0, 0.5, 1].forEach(function (f) { var k = Math.round(maxn * f); svgEl("line", { x1: X0, x2: X1, y1: sy(k), y2: sy(k), "class": "gridline" }, svg); text(X0 - 6, sy(k) + 4, k, "svg-small", "end"); });
      if (ty === "continuous") {
        var xmin = bars[0].x0, xmax = bars[bars.length - 1].x1, sx = function (x) { return X0 + (x - xmin) / (xmax - xmin) * (X1 - X0); };
        bars.forEach(function (b) { svgEl("rect", { x: sx(b.x0) + 0.5, y: sy(b.n), width: Math.max(0.8, sx(b.x1) - sx(b.x0) - 1), height: Y1 - sy(b.n), "class": "vbar" }, svg); });
        var span = xmax - xmin, raw = span / 6, mag = Math.pow(10, Math.floor(Math.log10(raw)));
        var tstep = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (x) { return x >= raw; })[0];
        for (var xv = Math.ceil(xmin / tstep) * tstep; xv <= xmax + 1e-9; xv += tstep) {
          var lbl = (v.unit === "$" ? "$" : "") + (tstep < 1 ? xv.toFixed(1) : Math.round(xv));
          svgEl("line", { x1: sx(xv), x2: sx(xv), y1: Y1, y2: Y1 + 4, "class": "axis" }, svg);
          text(sx(xv), Y1 + 16, lbl, "svg-small", "middle");
        }
        if (opt.rug) data.slice(0, 400).forEach(function (x) { svgEl("line", { x1: sx(x), x2: sx(x), y1: Y1 + 22, y2: Y1 + 30, "class": "rug" }, svg); });
      } else {
        var slot = (X1 - X0) / bars.length, bw = Math.min(70, slot * (ty === "discrete" ? 0.62 : 0.72));
        bars.forEach(function (b, k) {
          var x = X0 + k * slot + (slot - bw) / 2;
          svgEl("rect", { x: x, y: sy(b.n), width: bw, height: Y1 - sy(b.n), "class": "vbar" }, svg);
          if (bars.length <= 20) text(x + bw / 2, sy(b.n) - 4, b.n, "svg-small svg-strong", "middle");
          var lab = text(x + bw / 2, Y1 + 16, b.label, "svg-small", "middle");
          if (bars.length > 12 && k % 2) lab.setAttribute("y", Y1 + 28);
        });
      }
      text(X0, Y1 + 50, v.name + (v.unit && ty !== "nominal" && ty !== "ordinal" ? " (" + v.unit + ")" : "") + " — " + n.toLocaleString() + " " + d.recordNoun, "svg-small svg-strong", "start");
      svgEl("line", { x1: X0, x2: X1, y1: Y1, y2: Y1, "class": "axis" }, svg);
      return "<strong>" + info.group + ", " + info.label.toLowerCase() + ":</strong> " + info.note + " " + note;
    }
    function numSummary(data, v, dec) {
      var s = data.slice().sort(function (a, b) { return a - b; }), n = s.length, mean = s.reduce(function (a, b) { return a + b; }, 0) / n;
      var med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
      var sd = Math.sqrt(s.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / (n - 1));
      var f = function (x) { return (v.unit === "$" ? "$" : "") + x.toFixed(v.unit === "$" ? 2 : Math.max(dec, v.dec || 0)) + (v.unit === "$" ? "" : " " + v.unit); };
      return "Mean " + f(mean) + ", median " + f(med) + ", SD " + f(sd) + ".";
    }

    function draw() {
      var d = S[cur];
      clear(svg);
      var titles = { bars: "Total by " + d.siteNoun, heat: d.heat.title, map: opt.mapRes === "hoods" ? d.hoodTitle : d.mapTitle,
        network: "Lines connect " + d.siteNoun + "s; thicker means more " + d.edgeNoun, series: d.series.title + ", one year", vars: "Four types of variables in " + d.recordNoun + " data" };
      root.querySelector("#x391-vtitle").textContent = titles[view];
      var note = ({ bars: drawBars, heat: drawHeat, map: drawMap, network: drawNetwork, series: drawSeries, vars: drawVars })[view](d);
      root.querySelector("#x391-note").innerHTML = (view === "vars" ? "" : "<strong>What this view shows:</strong> ") + note;
      var selEl = root.querySelector("#x391-sel"), selViews = view === "bars" || (view === "map" && opt.mapRes === "sites") || view === "network";
      if (sel !== null && selViews) {
        var nb = neighbors(sel);
        selEl.innerHTML = "<strong>Selected: " + d.names[sel] + "</strong> (" + d.fmtV(d.values[sel]) + ")" +
          (nb.length ? ". Strongest link: " + d.names[nb[0][0]] + " (" + nb[0][1].toLocaleString() + " " + d.edgeNoun.replace(/ \(.*\)/, "") + ")." : ".") +
          ' <button type="button" class="btn-link" id="x391-clear">Clear</button>';
        selEl.querySelector("#x391-clear").addEventListener("click", function () { sel = null; draw(); });
      } else selEl.innerHTML = selViews ? "Click a " + d.siteNoun + " to highlight it in the bar chart, map, and network." : "";
    }
    function setScenario(key) {
      cur = key; sel = null; opt.playT = 364;
      root.querySelectorAll("#x391-scen button").forEach(function (b) {
        var on = b.getAttribute("data-s") === key; b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on));
      });
      root.querySelector("#x391-card").innerHTML = "<h4>" + S[key].heading + "</h4><p>" + S[key].story + "</p>";
      root.querySelector("#x391-recipe").innerHTML = "<ul>" +
        "<li><b>Locations and totals:</b> the 12 " + S[key].siteNoun + "s, their yearly totals, and the links between them were set by hand to show a realistic pattern.</li>" +
        "<li><b>Map:</b> Riverton's river, streets, neighborhoods, and hills are invented" + (S[key].hoodRate ? ", and so are the neighborhood populations used for the rates" : "") + ".</li>" +
        "<li><b>Time series:</b> " + S[key].recipe + "</li>" +
        "<li><b>Variable types:</b> about 1,500 " + S[key].recordNoun + ", each value drawn at random from a distribution chosen to look like real data of that kind (for example, skewed curves for durations and amounts).</li></ul>";
      buildControls(); draw();
    }
    root.querySelectorAll("#x391-scen button").forEach(function (b) { b.addEventListener("click", function () { setScenario(b.getAttribute("data-s")); }); });
    root.querySelectorAll("#x391-tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        view = b.getAttribute("data-v");
        root.querySelectorAll("#x391-tabs button").forEach(function (o) { o.classList.toggle("active", o === b); o.setAttribute("aria-selected", String(o === b)); });
        buildControls(); draw();
      });
    });
    setScenario("transport");
    return { setScenario: setScenario };
  }

  /* ---------- toggles ---------- */
  var builders = { "291x": build291, "361": build361, "391": build391 };
  var apis = {};
  function openPanel(btn) {
    var key = btn.getAttribute("data-explore"), panel = document.getElementById(btn.getAttribute("aria-controls"));
    btn.setAttribute("aria-expanded", "true");
    panel.hidden = false;
    if (!apis[key]) apis[key] = builders[key](panel.querySelector(".panel-body")) || {};
    return panel;
  }
  document.querySelectorAll("[data-explore]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.getAttribute("aria-expanded") === "true") {
        btn.setAttribute("aria-expanded", "false");
        document.getElementById(btn.getAttribute("aria-controls")).hidden = true;
      } else { openPanel(btn); }
    });
  });
  document.querySelectorAll("[data-scenario]").forEach(function (b) {
    b.addEventListener("click", function (ev) {
      ev.preventDefault();
      var course = b.getAttribute("data-course") || "361";
      var btn = document.querySelector('[data-explore="' + course + '"]'), panel = openPanel(btn);
      apis[course].setScenario(b.getAttribute("data-scenario"));
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });
})();

/* 3. Course blocks: each course title opens and closes that course's details.
      Courses start closed; a link to #mth-291x, #mth-361, or #mth-391 opens that course. */
(function () {
  "use strict";
  function parts(c) { return { body: c.querySelector(".course-body"), toggle: c.querySelector(".course-toggle") }; }
  function setOpen(c, open) {
    var p = parts(c);
    if (!p.body || !p.toggle) return;
    p.body.hidden = !open;
    p.toggle.setAttribute("aria-expanded", String(open));
    c.classList.toggle("is-open", open);
  }
  document.querySelectorAll(".course").forEach(function (c) {
    var p = parts(c);
    if (!p.body || !p.toggle) return;
    p.body.id = p.body.id || c.id + "-details";
    p.toggle.setAttribute("role", "button");
    p.toggle.setAttribute("aria-controls", p.body.id);
    setOpen(c, false);
    p.toggle.addEventListener("click", function (ev) { ev.preventDefault(); setOpen(c, p.body.hidden); });
    p.toggle.addEventListener("keydown", function (ev) {
      if (ev.key === " ") { ev.preventDefault(); setOpen(c, p.body.hidden); }
    });
  });
  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1)), el = id && document.getElementById(id);
    var c = el && el.closest(".course");
    if (c) { setOpen(c, true); el.scrollIntoView(); }
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
})();
