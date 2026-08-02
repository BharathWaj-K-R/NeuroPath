/* NeuroPath — vanilla JS SPA */
(function () {
  "use strict";

  /* ---------------- constants ---------------- */
  var API = "/api";
  var TOKEN_KEY = "neuropath_token";
  var USER_KEY = "neuropath_user";
  var LOCAL_PATHS = "neuropath_paths";

  var app = document.getElementById("app");
  var modalRoot = document.getElementById("modal-root");
  var toasts = document.getElementById("toasts");

  var LOGO =
    '<span class="logo-mark CLS" aria-hidden="true">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="9" r="2.5"/><circle cx="8" cy="18" r="2.5"/>' +
    '<path d="M8.2 7 15.8 8.3M7.2 8.4 7.6 15.5M10.4 16.6 16.6 11.2"/></svg></span>';

  function logo(sm) {
    return LOGO.replace("CLS", sm ? "sm" : "");
  }

  /* ---------------- state ---------------- */
  var state = {
    user: readJSON(USER_KEY),
    token: localStorage.getItem(TOKEN_KEY),
    route: "dashboard",
    pathId: null,
    paths: [],
    loadingPaths: false,
    pathsError: "",
    sidebarOpen: false,
    modal: null,
  };

  function readJSON(k) {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch (e) {
      return null;
    }
  }

  /* ---------------- utils ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(d) {
    var dt = new Date(d);
    if (isNaN(dt)) return "—";
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function toast(msg, kind) {
    var el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity .3s ease";
      setTimeout(function () {
        el.remove();
      }, 300);
    }, 3200);
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>' + esc(label || "Please wait…");
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  }

  /* ---------------- api ---------------- */
  function request(path, options) {
    options = options || {};
    var headers = { "Content-Type": "application/json" };
    if (state.token) headers.Authorization = "Bearer " + state.token;
    return fetch(API + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      if (res.status === 401) {
        logout(true);
        var err = new Error("Your session expired. Please log in again.");
        err.status = 401;
        throw err;
      }
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          if (!res.ok) {
            var e = new Error(data.message || data.detail || data.error || "Request failed (" + res.status + ")");
            e.status = res.status;
            throw e;
          }
          return data;
        });
    });
  }

  /* Offline/demo fallback so the UI stays usable when /api is not deployed. */
  function isUnavailable(err) {
    return !err.status || err.status === 404 || err.status >= 500;
  }

  function localPaths() {
    return readJSON(LOCAL_PATHS) || [];
  }
  function saveLocalPaths(list) {
    localStorage.setItem(LOCAL_PATHS, JSON.stringify(list));
  }

  function demoContent(topic, difficulty, goals) {
    var t = topic;
    return [
      { type: "h", text: "Overview" },
      {
        type: "p",
        text:
          "A " +
          difficulty.toLowerCase() +
          " path for " +
          t +
          "." +
          (goals ? " Focused on: " + goals + "." : ""),
      },
      { type: "h", text: "Module 1 — Foundations" },
      { type: "ul", items: ["Core vocabulary and mental models", "Set up your tools and workspace", "Build one tiny end-to-end example"] },
      { type: "h", text: "Module 2 — Practice" },
      { type: "ul", items: ["Daily 30-minute focused reps", "Recreate two real-world examples from scratch", "Explain each concept out loud in your own words"] },
      { type: "h", text: "Module 3 — Depth" },
      { type: "ul", items: ["Study edge cases and failure modes", "Read source material or specs directly", "Compare two competing approaches"] },
      { type: "h", text: "Capstone" },
      { type: "p", text: "Ship one complete project in " + t + " and write a short retrospective on what was hardest." },
    ];
  }

  /* ---------------- auth ---------------- */
  function saveSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function logout(silent) {
    state.token = null;
    state.user = null;
    state.paths = [];
    state.route = "dashboard";
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (!silent) toast("Signed out.", "success");
    render();
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  }

  /* ---------------- views ---------------- */
  function authView() {
    var mode = authView.mode || "login";
    return (
      '<main class="auth-wrap">' +
      '<section class="auth-card">' +
      '<div class="auth-brand">' +
      logo(false) +
      "<h1>NeuroPath</h1>" +
      "<p>AI-generated learning paths, built around you.</p>" +
      "</div>" +
      '<div class="tabs" role="tablist" data-active="' + mode + '">' +
      '<button class="tab" role="tab" id="tab-login" data-tab="login" aria-selected="' + (mode === "login") + '" aria-controls="pane-login">Login</button>' +
      '<button class="tab" role="tab" id="tab-register" data-tab="register" aria-selected="' + (mode === "register") + '" aria-controls="pane-register">Register</button>' +
      "</div>" +
      '<div id="auth-alert"></div>' +
      (mode === "login" ? loginPane() : registerPane()) +
      "</section>" +
      "</main>"
    );
  }

  function loginPane() {
    return (
      '<form class="pane" id="pane-login" role="tabpanel" aria-labelledby="tab-login" novalidate>' +
      '<div class="field"><label for="li-email">Email</label>' +
      '<input class="input" id="li-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required />' +
      '<div class="field-error" data-error-for="li-email"></div></div>' +
      '<div class="field"><label for="li-password">Password</label>' +
      '<input class="input" id="li-password" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required />' +
      '<div class="field-error" data-error-for="li-password"></div></div>' +
      '<label class="checkbox" style="margin-bottom:18px"><input type="checkbox" id="li-remember" checked /> Remember me</label>' +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Login</button>' +
      "</form>"
    );
  }

  function registerPane() {
    return (
      '<form class="pane" id="pane-register" role="tabpanel" aria-labelledby="tab-register" novalidate>' +
      '<div class="field"><label for="rg-name">Full name</label>' +
      '<input class="input" id="rg-name" name="full_name" type="text" autocomplete="name" placeholder="Ada Lovelace" required />' +
      '<div class="field-error" data-error-for="rg-name"></div></div>' +
      '<div class="field"><label for="rg-email">Email</label>' +
      '<input class="input" id="rg-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required />' +
      '<div class="field-error" data-error-for="rg-email"></div></div>' +
      '<div class="field"><label for="rg-password">Password</label>' +
      '<input class="input" id="rg-password" name="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" required />' +
      '<div class="field-error" data-error-for="rg-password"></div></div>' +
      '<button class="btn btn-primary btn-block btn-lg" type="submit" style="margin-top:6px">Create Account</button>' +
      "</form>"
    );
  }

  function navbar() {
    var name = (state.user && (state.user.full_name || state.user.email)) || "there";
    return (
      '<header class="navbar"><div class="navbar-inner">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
      '<button class="hamburger" data-action="toggle-sidebar" aria-label="Toggle navigation" aria-expanded="' + state.sidebarOpen + '"><span></span></button>' +
      '<a class="brand" href="#" data-nav="dashboard">' + logo(true) + "NeuroPath</a>" +
      "</div>" +
      '<div class="nav-right">' +
      '<span class="welcome">Welcome, ' + esc(name) + "</span>" +
      '<button class="btn btn-secondary" data-action="logout">Logout</button>' +
      "</div></div></header>"
    );
  }

  function sidebar() {
    function item(route, label, icon) {
      return (
        '<button class="side-link' + (state.route === route ? " active" : "") + '" data-nav="' + route + '"' +
        (state.route === route ? ' aria-current="page"' : "") + ">" + icon + esc(label) + "</button>"
      );
    }
    var ic = function (d) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>";
    };
    return (
      '<nav class="sidebar' + (state.sidebarOpen ? " open" : "") + '" aria-label="Main">' +
      item("dashboard", "Dashboard", ic('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>')) +
      item("paths", "My Learning Paths", ic('<path d="M4 19.5V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 1.5z"/><path d="M8 8h7"/>')) +
      item("settings", "Settings", ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.7 1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z"/>')) +
      '<button class="side-link" data-action="logout">' + ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>') + "Logout</button>" +
      "</nav>"
    );
  }

  function pathCard(p) {
    var prog = Math.max(0, Math.min(100, p.progress || 0));
    var diff = (p.difficulty_level || "Intermediate").toLowerCase();
    return (
      '<article class="card path-card">' +
      "<h3>" + esc(p.topic) + "</h3>" +
      '<div class="meta"><span class="badge badge-' + esc(diff) + '">' + esc(p.difficulty_level || "Intermediate") + "</span>" +
      "<span>" + esc(fmtDate(p.created_at)) + "</span>" +
      (prog === 100 ? '<span class="badge badge-done">Completed</span>' : "") +
      "</div>" +
      '<div class="progress' + (prog === 100 ? " done" : "") + '" role="progressbar" aria-valuenow="' + prog + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + prog + '%"></i></div>' +
      '<div class="meta" style="justify-content:space-between">' +
      "<span>" + prog + "% complete</span>" +
      '<a href="#" data-view-path="' + esc(p.id) + '">View →</a>' +
      "</div></article>"
    );
  }

  function dashboardView(onlyPaths) {
    var head =
      '<div class="page-head"><div>' +
      "<h2>" + (onlyPaths ? "My Learning Paths" : "Dashboard") + "</h2>" +
      "<p>" + (onlyPaths ? "Everything you're studying, in one place." : "Pick up where you left off, or start something new.") + "</p>" +
      "</div>" +
      '<button class="btn btn-primary btn-lg" data-action="open-generate">＋ Generate New Learning Path</button></div>';

    var body;
    if (state.loadingPaths) {
      body = '<div class="grid"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
    } else if (state.pathsError) {
      body = '<div class="alert alert-error">' + esc(state.pathsError) + "</div>";
    } else if (!state.paths.length) {
      body =
        '<div class="card empty"><h3>No learning paths yet. Create one!</h3>' +
        "<p>Tell NeuroPath what you want to learn and it will build a structured path for you.</p>" +
        '<button class="btn btn-primary btn-lg" data-action="open-generate">Generate New Learning Path</button></div>';
    } else {
      body = '<div class="grid">' + state.paths.map(pathCard).join("") + "</div>";
    }
    return head + body;
  }

  function renderContent(content) {
    if (typeof content === "string") {
      return content
        .split(/\n{2,}/)
        .map(function (b) {
          return "<p>" + esc(b).replace(/\n/g, "<br/>") + "</p>";
        })
        .join("");
    }
    if (!Array.isArray(content)) return "<p>No content available.</p>";
    return content
      .map(function (b) {
        if (b.type === "h") return "<h3>" + esc(b.text) + "</h3>";
        if (b.type === "ul")
          return "<ul>" + (b.items || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>";
        return "<p>" + esc(b.text) + "</p>";
      })
      .join("");
  }

  function pathView() {
    var p = state.paths.filter(function (x) { return String(x.id) === String(state.pathId); })[0];
    if (!p) return '<div class="card empty"><h3>Path not found</h3><p>It may have been removed.</p><button class="btn btn-secondary" data-nav="dashboard">Back to Dashboard</button></div>';
    var prog = Math.max(0, Math.min(100, p.progress || 0));
    var diff = (p.difficulty_level || "Intermediate").toLowerCase();
    return (
      '<a href="#" data-nav="dashboard" style="font-size:14px">← Back to Dashboard</a>' +
      '<div class="page-head" style="margin-top:12px"><div>' +
      "<h2>" + esc(p.topic) + "</h2>" +
      '<div class="meta" style="margin-top:6px"><span class="badge badge-' + esc(diff) + '">' + esc(p.difficulty_level) + "</span><span>Created " + esc(fmtDate(p.created_at)) + "</span></div>" +
      "</div>" +
      (prog === 100
        ? '<span class="badge badge-done" style="padding:8px 14px">✓ Completed</span>'
        : '<button class="btn btn-primary" data-action="complete" data-id="' + esc(p.id) + '">Mark as Completed</button>') +
      "</div>" +
      '<div class="card" style="margin-bottom:16px">' +
      '<div class="meta" style="justify-content:space-between;margin-bottom:8px"><span>Progress</span><span>' + prog + "%</span></div>" +
      '<div class="progress' + (prog === 100 ? " done" : "") + '" role="progressbar" aria-valuenow="' + prog + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + prog + '%"></i></div>' +
      "</div>" +
      (p.goals ? '<div class="card" style="margin-bottom:16px"><strong>Your goal:</strong> ' + esc(p.goals) + "</div>" : "") +
      '<div class="card path-content">' + renderContent(p.content) + "</div>"
    );
  }

  function settingsView() {
    var u = state.user || {};
    return (
      '<div class="page-head"><div><h2>Settings</h2><p>Manage your account and security.</p></div></div>' +
      '<div class="card" style="margin-bottom:16px"><h3 style="font-size:16px;margin-bottom:10px">Profile</h3>' +
      '<div class="meta"><span>Name</span></div><p style="margin-bottom:8px">' + esc(u.full_name || "—") + "</p>" +
      '<div class="meta"><span>Email</span></div><p>' + esc(u.email || "—") + "</p></div>" +
      '<form class="card" id="pw-form" style="margin-bottom:16px" novalidate>' +
      '<h3 style="font-size:16px;margin-bottom:12px">Change password</h3>' +
      '<div id="pw-alert"></div>' +
      '<div class="field"><label for="pw-current">Current password</label><input class="input" id="pw-current" type="password" autocomplete="current-password" /><div class="field-error" data-error-for="pw-current"></div></div>' +
      '<div class="field"><label for="pw-new">New password</label><input class="input" id="pw-new" type="password" autocomplete="new-password" /><div class="field-error" data-error-for="pw-new"></div></div>' +
      '<button class="btn btn-primary" type="submit">Update password</button></form>' +
      '<div class="card" style="border-color:#fed7d7"><h3 style="font-size:16px;margin-bottom:6px;color:#c53030">Delete account</h3>' +
      '<p style="color:var(--text-muted);font-size:14px;margin-bottom:14px">This permanently removes your account and every learning path. This cannot be undone.</p>' +
      '<button class="btn btn-danger" data-action="delete-account">Delete my account</button></div>'
    );
  }

  function appView() {
    var main =
      state.route === "settings" ? settingsView() :
      state.route === "path" ? pathView() :
      dashboardView(state.route === "paths");
    return navbar() + '<div class="layout">' + sidebar() + "<main>" + main + "</main></div>";
  }

  function generateModal() {
    return (
      '<div class="overlay" data-overlay role="dialog" aria-modal="true" aria-labelledby="gen-title">' +
      '<form class="modal" id="gen-form" novalidate>' +
      '<h2 id="gen-title">Create Your Learning Path</h2>' +
      '<p class="sub">Describe what you want to learn and NeuroPath does the rest.</p>' +
      '<div id="gen-alert"></div>' +
      '<div class="field"><label for="gen-topic">Topic <span aria-hidden="true">*</span></label>' +
      '<input class="input" id="gen-topic" type="text" placeholder="e.g. Linear algebra for machine learning" required />' +
      '<div class="field-error" data-error-for="gen-topic"></div></div>' +
      '<div class="field"><label for="gen-diff">Difficulty</label>' +
      '<select class="select" id="gen-diff"><option>Beginner</option><option selected>Intermediate</option><option>Advanced</option></select></div>' +
      '<div class="field"><label for="gen-goals">Goals <span style="font-weight:400;color:var(--text-muted)">(optional)</span></label>' +
      '<textarea class="textarea" id="gen-goals" placeholder="What do you want to achieve?"></textarea></div>' +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Generate Path</button>' +
      '<div class="modal-actions"><button class="btn btn-secondary btn-block" type="button" data-action="close-modal">Cancel</button></div>' +
      "</form></div>"
    );
  }

  /* ---------------- render ---------------- */
  function render() {
    app.innerHTML = state.token && state.user ? appView() : authView();
    modalRoot.innerHTML = state.modal === "generate" ? generateModal() : "";
    if (state.modal === "generate") {
      var t = document.getElementById("gen-topic");
      if (t) t.focus();
    }
  }

  function fieldError(id, msg) {
    var box = document.querySelector('[data-error-for="' + id + '"]');
    var input = document.getElementById(id);
    if (box) box.textContent = msg || "";
    if (input) input.classList.toggle("invalid", !!msg);
    return !msg;
  }

  function alertIn(containerId, msg, kind) {
    var el = document.getElementById(containerId);
    if (el) el.innerHTML = msg ? '<div class="alert alert-' + (kind || "error") + '">' + esc(msg) + "</div>" : "";
  }

  /* ---------------- data ---------------- */
  function loadPaths() {
    state.loadingPaths = true;
    state.pathsError = "";
    render();
    request("/learning-paths")
      .then(function (data) {
        state.paths = (Array.isArray(data) ? data : data.items || data.data || []).map(normalize);
      })
      .catch(function (err) {
        if (err.status === 401) return;
        if (isUnavailable(err)) {
          state.paths = localPaths().map(normalize);
        } else {
          state.pathsError = err.message;
        }
      })
      .then(function () {
        state.loadingPaths = false;
        render();
      });
  }

  function normalize(p) {
    return {
      id: p.id != null ? p.id : String(Date.now() + Math.random()),
      topic: p.topic || "Untitled path",
      difficulty_level: p.difficulty_level || p.difficulty || "Intermediate",
      goals: p.goals || "",
      created_at: p.created_at || p.createdAt || new Date().toISOString(),
      progress: typeof p.progress === "number" ? p.progress : 0,
      content: p.content || p.body || [],
    };
  }

  function persistLocal() {
    saveLocalPaths(state.paths);
  }

  /* ---------------- events (delegated) ---------------- */
  document.addEventListener("click", function (e) {
    var tab = e.target.closest("[data-tab]");
    if (tab) {
      authView.mode = tab.dataset.tab;
      render();
      return;
    }

    var nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      state.route = nav.dataset.nav;
      state.sidebarOpen = false;
      render();
      return;
    }

    var view = e.target.closest("[data-view-path]");
    if (view) {
      e.preventDefault();
      state.pathId = view.dataset.viewPath;
      state.route = "path";
      window.scrollTo(0, 0);
      render();
      return;
    }

    var act = e.target.closest("[data-action]");
    if (!act) {
      if (e.target.hasAttribute && e.target.hasAttribute("data-overlay")) {
        state.modal = null;
        render();
      }
      return;
    }
    var action = act.dataset.action;

    if (action === "logout") logout();
    else if (action === "toggle-sidebar") {
      state.sidebarOpen = !state.sidebarOpen;
      render();
    } else if (action === "open-generate") {
      state.modal = "generate";
      render();
    } else if (action === "close-modal") {
      state.modal = null;
      render();
    } else if (action === "complete") {
      completePath(act, act.dataset.id);
    } else if (action === "delete-account") {
      if (window.confirm("Delete your account and all learning paths? This cannot be undone.")) {
        localStorage.removeItem(LOCAL_PATHS);
        logout(true);
        toast("Account deleted.", "error");
      }
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state.modal) {
      state.modal = null;
      render();
    }
  });

  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (form.id === "pane-login") { e.preventDefault(); doLogin(form); }
    else if (form.id === "pane-register") { e.preventDefault(); doRegister(form); }
    else if (form.id === "gen-form") { e.preventDefault(); doGenerate(form); }
    else if (form.id === "pw-form") { e.preventDefault(); doChangePassword(form); }
  });

  /* ---------------- handlers ---------------- */
  function doLogin(form) {
    alertIn("auth-alert", "");
    var email = document.getElementById("li-email").value;
    var pw = document.getElementById("li-password").value;
    var ok = fieldError("li-email", validEmail(email) ? "" : "Enter a valid email address.");
    ok = fieldError("li-password", pw.length >= 8 ? "" : "Password must be at least 8 characters.") && ok;
    if (!ok) return;

    var btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, "Logging in…");
    request("/auth/login", { method: "POST", body: { email: email.trim(), password: pw } })
      .then(function (data) {
        saveSession(data.access_token || data.token || "demo-token", data.user || { email: email.trim(), full_name: (data.user && data.user.full_name) || email.split("@")[0] });
        toast("Welcome back!", "success");
        render();
        loadPaths();
      })
      .catch(function (err) {
        setBusy(btn, false);
        if (isUnavailable(err)) {
          saveSession("demo-token", { email: email.trim(), full_name: email.split("@")[0] });
          toast("Signed in (offline demo mode).", "success");
          render();
          loadPaths();
        } else {
          alertIn("auth-alert", err.message);
        }
      });
  }

  function doRegister(form) {
    alertIn("auth-alert", "");
    var name = document.getElementById("rg-name").value;
    var email = document.getElementById("rg-email").value;
    var pw = document.getElementById("rg-password").value;
    var ok = fieldError("rg-name", name.trim().length >= 2 ? "" : "Please enter your full name.");
    ok = fieldError("rg-email", validEmail(email) ? "" : "Enter a valid email address.") && ok;
    ok = fieldError("rg-password", pw.length >= 8 ? "" : "Password must be at least 8 characters.") && ok;
    if (!ok) return;

    var btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, "Creating account…");
    request("/auth/register", { method: "POST", body: { email: email.trim(), password: pw, full_name: name.trim() } })
      .then(function (data) {
        saveSession(data.access_token || data.token || "demo-token", data.user || { email: email.trim(), full_name: name.trim() });
        toast("Account created. Welcome!", "success");
        render();
        loadPaths();
      })
      .catch(function (err) {
        setBusy(btn, false);
        if (isUnavailable(err)) {
          saveSession("demo-token", { email: email.trim(), full_name: name.trim() });
          toast("Account created (offline demo mode).", "success");
          render();
          loadPaths();
        } else {
          alertIn("auth-alert", err.message);
        }
      });
  }

  function doGenerate(form) {
    alertIn("gen-alert", "");
    var topic = document.getElementById("gen-topic").value;
    var difficulty = document.getElementById("gen-diff").value;
    var goals = document.getElementById("gen-goals").value.trim();
    if (!fieldError("gen-topic", topic.trim().length >= 2 ? "" : "Please enter a topic.")) return;

    var btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, "Generating…");

    request("/ai/generate-path", { method: "POST", body: { topic: topic.trim(), difficulty_level: difficulty, goals: goals } })
      .then(function (gen) {
        return request("/learning-paths", {
          method: "POST",
          body: { topic: topic.trim(), difficulty_level: difficulty, goals: goals, content: gen.content || gen },
        });
      })
      .then(function (created) {
        addPath(normalize(created));
      })
      .catch(function (err) {
        if (err.status === 401) return;
        if (isUnavailable(err)) {
          addPath(
            normalize({
              id: "local-" + Date.now(),
              topic: topic.trim(),
              difficulty_level: difficulty,
              goals: goals,
              created_at: new Date().toISOString(),
              progress: 0,
              content: demoContent(topic.trim(), difficulty, goals),
            })
          );
          persistLocal();
        } else {
          setBusy(btn, false);
          alertIn("gen-alert", err.message);
        }
      });
  }

  function addPath(p) {
    state.paths.unshift(p);
    state.modal = null;
    state.pathId = p.id;
    state.route = "path";
    toast("Learning path ready!", "success");
    window.scrollTo(0, 0);
    render();
  }

  function completePath(btn, id) {
    var p = state.paths.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!p) return;
    setBusy(btn, true, "Saving…");
    request("/learning-paths/" + id, { method: "PATCH", body: { progress: 100 } })
      .catch(function () { /* offline fallback */ })
      .then(function () {
        p.progress = 100;
        persistLocal();
        toast("Marked as completed 🎉", "success");
        render();
      });
  }

  function doChangePassword(form) {
    alertIn("pw-alert", "");
    var cur = document.getElementById("pw-current").value;
    var nw = document.getElementById("pw-new").value;
    var ok = fieldError("pw-current", cur.length >= 8 ? "" : "Enter your current password.");
    ok = fieldError("pw-new", nw.length >= 8 ? "" : "New password must be at least 8 characters.") && ok;
    if (!ok) return;
    var btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, "Updating…");
    request("/auth/change-password", { method: "POST", body: { current_password: cur, new_password: nw } })
      .then(function () {
        setBusy(btn, false);
        form.reset();
        alertIn("pw-alert", "Password updated.", "success");
      })
      .catch(function (err) {
        setBusy(btn, false);
        if (err.status === 401) return;
        alertIn("pw-alert", isUnavailable(err) ? "Password service is unavailable right now." : err.message);
      });
  }

  /* ---------------- boot ---------------- */
  render();
  if (state.token && state.user) loadPaths();
})();
