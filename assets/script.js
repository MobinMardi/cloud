/* ===================================================================
   Mobin Mardi — Cloud Computing visit card
   Splash reveal + background node network + passcode unlock + copy
   buttons.

   Note on the passcode gate: this runs entirely in the browser, so it
   only obscures the number from a casual glance (e.g. someone
   scrolling past your screen). Anyone who opens the page source can
   read the real number and the code, since there is no server to
   keep secrets on. It's a UI nicety, not real access control.
   =================================================================== */

(function theme() {
  var root = document.documentElement;
  var toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  function isDark() {
    return root.getAttribute("data-theme") === "dark";
  }

  function reflectButton() {
    var dark = isDark();
    toggle.setAttribute("aria-pressed", dark ? "true" : "false");
    toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  reflectButton();

  toggle.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
    reflectButton();
    document.dispatchEvent(new CustomEvent("themechange"));
  });
})();

(function splash() {
  var splashEl = document.getElementById("splash");
  if (!splashEl) return;

  // No skip logic here on purpose — the splash is meant to run on
  // every load, refresh included, not just the first visit.
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fillMs = reduceMotion ? 0 : 1200;   // matches the CSS fill animation
  var holdMs = reduceMotion ? 200 : 550;  // beat at full color before leaving
  var fadeMs = reduceMotion ? 200 : 500;  // splash fade-out

  splashEl.style.transition = "opacity " + fadeMs + "ms ease";

  setTimeout(function () {
    document.documentElement.classList.remove("splash-active");
    splashEl.classList.add("is-leaving");
    setTimeout(function () {
      splashEl.style.display = "none";
    }, fadeMs);
  }, fillMs + holdMs + 150);
})();

(function networkBackground() {
  var canvas = document.getElementById("network");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var width, height, dpr;
  var points = [];
  var colors = readColors();
  var LINK_DIST = 130;

  function readColors() {
    var styles = getComputedStyle(document.documentElement);
    return {
      line: styles.getPropertyValue("--net-line").trim() || "32, 28, 21",
      node: styles.getPropertyValue("--net-node").trim() || "125, 95, 40",
      lineAlpha: parseFloat(styles.getPropertyValue("--net-line-alpha")) || 0.035,
      nodeAlpha: parseFloat(styles.getPropertyValue("--net-node-alpha")) || 0.22
    };
  }

  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makePoints() {
    var area = width * height;
    var count = Math.round(Math.min(46, Math.max(18, area / 32000)));
    points = [];
    for (var i = 0; i < count; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    // links
    for (var i = 0; i < points.length; i++) {
      for (var j = i + 1; j < points.length; j++) {
        var a = points[i], b = points[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          ctx.strokeStyle = "rgba(" + colors.line + ", " + (colors.lineAlpha * (1 - dist / LINK_DIST)) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // nodes
    ctx.fillStyle = "rgba(" + colors.node + ", " + colors.nodeAlpha + ")";
    for (var k = 0; k < points.length; k++) {
      var p = points[k];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tick() {
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    }
    step();
    if (!reduceMotion) requestAnimationFrame(tick);
  }

  function start() {
    sizeCanvas();
    makePoints();
    step();
    if (!reduceMotion) requestAnimationFrame(tick);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      sizeCanvas();
      makePoints();
      step();
    }, 150);
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !reduceMotion) requestAnimationFrame(tick);
  });

  document.addEventListener("themechange", function () {
    colors = readColors();
    step();
  });

  start();
})();

(function passcodeGate() {
  var PASSCODE = "2005";

  var revealBtn = document.getElementById("revealBtn");
  var overlay = document.getElementById("modalOverlay");
  var modal = document.getElementById("passcodeModal");
  var input = document.getElementById("passcodeInput");
  var errorMsg = document.getElementById("modalError");
  var cancelBtn = document.getElementById("modalCancel");
  var submitBtn = document.getElementById("modalSubmit");
  var phoneEl = document.getElementById("personalPhone");

  if (!revealBtn) return;

  function openModal() {
    overlay.classList.add("is-open");
    errorMsg.classList.remove("is-visible");
    input.value = "";
    input.focus();
  }

  function closeModal() {
    overlay.classList.remove("is-open");
    revealBtn.focus();
  }

  function tryUnlock() {
    if (input.value === PASSCODE) {
      phoneEl.textContent = phoneEl.dataset.real;
      phoneEl.classList.remove("censored");
      phoneEl.classList.add("revealed");
      revealBtn.setAttribute("disabled", "true");
      revealBtn.querySelector("span").textContent = "Unlocked";
      closeModal();
    } else {
      errorMsg.classList.add("is-visible");
      modal.classList.add("shake");
      input.value = "";
      input.focus();
      setTimeout(function () {
        modal.classList.remove("shake");
      }, 350);
    }
  }

  revealBtn.addEventListener("click", openModal);
  cancelBtn.addEventListener("click", closeModal);
  submitBtn.addEventListener("click", tryUnlock);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("is-open")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "Enter") tryUnlock();
  });

  input.addEventListener("input", function () {
    input.value = input.value.replace(/[^0-9]/g, "").slice(0, 4);
  });
})();

(function copyButtons() {
  var buttons = document.querySelectorAll(".copy-btn");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      navigator.clipboard.writeText(text).then(function () {
        var original = btn.getAttribute("aria-label");
        btn.setAttribute("aria-label", "Copied");
        setTimeout(function () {
          btn.setAttribute("aria-label", original);
        }, 1200);
      });
    });
  });
})();
