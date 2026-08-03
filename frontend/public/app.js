/* NeuroPath — vanilla JS SPA */
(function () {
  "use strict";

  /* ---------------- constants ---------------- */
  var API = window.__API_URL__ || "/api";
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
    openModules: {},
    // generate/quiz wizard
   gen: {
    step: "form",
    topic: "",
    difficulty: "Intermediate",
    goals: "",
    quiz: null,
    answers: [],
    currentQuestion: 0,
    level: null,
    busy: false,
    error: ""
},
    // chat
    chat: { messages: [], sending: false },
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
      var isAuthEndpoint = path === "/auth/login" || path === "/auth/register";
      if (res.status === 401 && !isAuthEndpoint) {
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
    return {
      overview: "A " + difficulty.toLowerCase() + " path for " + topic + "." + (goals ? " Focused on: " + goals + "." : ""),
      modules: [
        { title: "Module 1 — Foundations", content: "Core vocabulary and mental models. Set up your tools and workspace. Build one tiny end-to-end example.", resources: [], exercises: ["Build a tiny end-to-end example"] },
        { title: "Module 2 — Practice", content: "Daily focused reps. Recreate two real-world examples from scratch.", resources: [], exercises: ["Recreate two real-world examples"] },
        { title: "Module 3 — Depth", content: "Study edge cases and failure modes. Compare two competing approaches.", resources: [], exercises: ["Write a comparison of two approaches"] },
        { title: "Capstone", content: "Ship one complete project in " + topic + " and write a short retrospective on what was hardest.", resources: [], exercises: ["Ship the capstone project"] },
      ],
    };
  }

  function demoQuiz(topic) {
    return {
      topic: topic,
      questions: [
        { question: "How would you describe your experience with " + topic + "?", options: ["Never worked with it", "Used it a little", "Comfortable with it", "Very experienced"], correct_index: 3, level: "beginner" },
        { question: "Have you completed a real project involving " + topic + "?", options: ["No", "A tutorial only", "One small project", "Several projects"], correct_index: 3, level: "intermediate" },
        { question: "Could you explain an advanced concept in " + topic + " to someone else?", options: ["Not at all", "Maybe the basics", "Yes, mostly", "Yes, confidently"], correct_index: 3, level: "advanced" },
      ],
    };
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
    return /^[^\s@]+@[^\s@]{2,}$/.test(v.trim()) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  }

  /* ---------------- views: auth ---------------- */
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

  /* ---------------- views: shell ---------------- */
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
      item("chat", "Chat with Tutor", ic('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>')) +
      item("settings", "Settings", ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.7 1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z"/>')) +
      '<button class="side-link" data-action="logout">' + ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>') + "Logout</button>" +
      "</nav>"
    );
  }

  /* ---------------- views: dashboard / paths ---------------- */
  function pathCard(p) {
    var prog = Math.max(0, Math.min(100, p.progress || 0));
    var diff = (p.difficulty_level || "Intermediate").toLowerCase();
    var total = (p.modules || []).length;
    return (
      '<article class="card path-card">' +
      '<div class="path-card-top"><h3>' + esc(p.topic) + '</h3>' +
      '<button class="icon-btn danger" data-action="delete-path" data-id="' + esc(p.id) + '" title="Delete path" aria-label="Delete path">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>' +
      "</div>" +
      '<div class="meta"><span class="badge badge-' + esc(diff) + '">' + esc(p.difficulty_level || "Intermediate") + "</span>" +
      "<span>" + esc(fmtDate(p.created_at)) + "</span>" +
      (total ? "<span>" + total + " modules</span>" : "") +
      (prog === 100 ? '<span class="badge badge-done">Completed</span>' : "") +
      "</div>" +
      '<div class="progress' + (prog === 100 ? " done" : "") + '" role="progressbar" aria-valuenow="' + prog + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + prog + '%"></i></div>' +
      '<div class="meta" style="justify-content:space-between">' +
      "<span>" + Math.round(prog) + "% complete</span>" +
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
        "<p>Tell NeuroPath what you want to learn and it will build a structured, interactive path for you.</p>" +
        '<button class="btn btn-primary btn-lg" data-action="open-generate">Generate New Learning Path</button></div>';
    } else {
      body = '<div class="grid">' + state.paths.map(pathCard).join("") + "</div>";
    }
    return head + body;
  }

  /* ---------------- views: interactive path detail ---------------- */
  function moduleBlock(p, m, idx) {
    var isOpen = !!state.openModules[p.id + ":" + idx];
    var done = (p.completed_modules || []).indexOf(idx) !== -1;
    var resources = (m.resources || []).map(function (r) {
      var isUrl = /^https?:\/\//.test(r) || /^www\./.test(r);
      if (isUrl) {
        var href = /^https?:\/\//.test(r) ? r : "https://" + r;
        return "<li><a href=\"" + esc(href) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(r) + " ↗</a></li>";
      }
      return "<li>" + esc(r) + "</li>";
    }).join("");
    var exercises = (m.exercises || []).map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("");
    return (
      '<div class="module' + (done ? " done" : "") + '">' +
      '<div class="module-header" data-action="toggle-module-open" data-id="' + esc(p.id) + '" data-idx="' + idx + '">' +
      '<label class="checkbox module-check" onclick="event.stopPropagation()">' +
      '<input type="checkbox" ' + (done ? "checked" : "") + ' data-action="toggle-module-done" data-id="' + esc(p.id) + '" data-idx="' + idx + '" />' +
      "</label>" +
      '<span class="module-title">' + esc(m.title || "Module " + (idx + 1)) + "</span>" +
      '<span class="module-chevron">' + (isOpen ? "▾" : "▸") + "</span>" +
      "</div>" +
      (isOpen
        ? '<div class="module-body">' +
          "<p>" + esc(m.content || "").replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>") + "</p>" +
          (resources ? '<h4>Resources</h4><ul>' + resources + "</ul>" : "") +
          (exercises ? '<h4>Exercises</h4><ul>' + exercises + "</ul>" : "") +
          "</div>"
        : "") +
      "</div>"
    );
  }

  function pathView() {
    var p = state.paths.filter(function (x) { return String(x.id) === String(state.pathId); })[0];
    if (!p) return '<div class="card empty"><h3>Path not found</h3><p>It may have been removed.</p><button class="btn btn-secondary" data-nav="dashboard">Back to Dashboard</button></div>';
    var modules = p.modules || [];
    var total = modules.length;
    var doneCount = (p.completed_modules || []).length;
    var prog = total ? Math.round((doneCount / total) * 100) : Math.round(p.progress || 0);
    var diff = (p.difficulty_level || "Intermediate").toLowerCase();
    return (
      '<a href="#" data-nav="dashboard" style="font-size:14px">← Back to Dashboard</a>' +
      '<div class="page-head" style="margin-top:12px"><div>' +
      "<h2>" + esc(p.topic) + "</h2>" +
      '<div class="meta" style="margin-top:6px"><span class="badge badge-' + esc(diff) + '">' + esc(p.difficulty_level) + "</span><span>Created " + esc(fmtDate(p.created_at)) + "</span></div>" +
      "</div>" +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      (prog === 100
        ? '<span class="badge badge-done" style="padding:8px 14px">✓ Completed</span>'
        : '<button class="btn btn-primary" data-action="complete" data-id="' + esc(p.id) + '">Mark All Complete</button>') +
      '<button class="btn btn-danger" data-action="delete-path" data-id="' + esc(p.id) + '">Delete Path</button>' +
      "</div></div>" +
      '<div class="card" style="margin-bottom:16px">' +
      '<div class="meta" style="justify-content:space-between;margin-bottom:8px"><span>Total progress · ' + doneCount + ' / ' + total + ' modules</span><span>' + prog + "%</span></div>" +
      '<div class="progress' + (prog === 100 ? " done" : "") + '" role="progressbar" aria-valuenow="' + prog + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + prog + '%"></i></div>' +
      "</div>" +
      (p.goals ? '<div class="card" style="margin-bottom:16px"><strong>Your goal:</strong> ' + esc(p.goals) + "</div>" : "") +
      (p.overview ? '<div class="card" style="margin-bottom:16px"><strong>Overview</strong><p style="margin-top:6px">' + esc(p.overview) + "</p></div>" : "") +
      '<div class="module-list">' + modules.map(function (m, idx) { return moduleBlock(p, m, idx); }).join("") + "</div>"
    );
  }

  /* ---------------- views: settings ---------------- */
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

  /* ---------------- views: chat ---------------- */
  function chatView() {
    var msgs = state.chat.messages;
    var body = !msgs.length
      ? '<div class="chat-empty">Ask about anything in your learning paths — NeuroPath\'s tutor is ready.</div>'
      : msgs.map(function (m) {
          return '<div class="chat-msg ' + (m.role === "user" ? "user" : "assistant") + '">' +
            '<div class="chat-bubble">' + esc(m.content) + "</div></div>";
        }).join("");
    if (state.chat.sending) {
      body += '<div class="chat-msg assistant"><div class="chat-bubble typing"><span></span><span></span><span></span></div></div>';
    }
    return (
      '<div class="page-head"><div><h2>Chat with Tutor</h2><p>Ask questions, get explanations, stay unstuck.</p></div></div>' +
      '<div class="chat-wrap">' +
      '<div class="chat-messages" id="chat-messages">' + body + "</div>" +
      '<form class="chat-input-row" id="chat-form">' +
      '<input class="input" id="chat-input" type="text" placeholder="Ask the tutor anything…" autocomplete="off" ' + (state.chat.sending ? "disabled" : "") + ' />' +
      '<button class="btn btn-primary" type="submit" ' + (state.chat.sending ? "disabled" : "") + '>Send</button>' +
      "</form></div>"
    );
  }

  /* ---------------- app shell ---------------- */
  function appView() {
    var main =
      state.route === "settings" ? settingsView() :
      state.route === "path" ? pathView() :
      state.route === "chat" ? chatView() :
      dashboardView(state.route === "paths");
    return navbar() + '<div class="layout">' + sidebar() + "<main>" + main + "</main></div>";
  }

  /* ---------------- generate modal (topic -> quiz -> result) ---------------- */
  function generateModal() {
    var g = state.gen;
    var inner;
    if (g.step === "form") {
      inner =
        '<h2>Create Your Learning Path</h2>' +
        '<p class="sub">Describe what you want to learn — we\'ll quiz you first to gauge your level.</p>' +
        '<div id="gen-alert"></div>' +
        '<form id="gen-form" novalidate>' +
        '<div class="field"><label for="gen-topic">Topic <span aria-hidden="true">*</span></label>' +
        '<input class="input" id="gen-topic" type="text" value="' + esc(g.topic) + '" placeholder="e.g. Linear algebra for machine learning" required />' +
        '<div class="field-error" data-error-for="gen-topic"></div></div>' +
        '<div class="field"><label for="gen-goals">Goals <span style="font-weight:400;color:var(--text-muted)">(optional)</span></label>' +
        '<textarea class="textarea" id="gen-goals" placeholder="What do you want to achieve?">' + esc(g.goals) + "</textarea></div>" +
        '<button class="btn btn-primary btn-block btn-lg" type="submit">Start Skill Quiz</button>' +
        '<div class="modal-actions">' +
        '<button class="btn btn-secondary btn-block" type="button" data-action="skip-quiz">Skip quiz, pick difficulty manually</button>' +
        "</div>" +
        "</form>";
    } else if (g.step === "manual") {
      inner =
        '<h2>Create Your Learning Path</h2>' +
        '<p class="sub">Pick a difficulty directly.</p>' +
        '<div id="gen-alert"></div>' +
        '<form id="gen-manual-form" novalidate>' +
        '<div class="field"><label for="gen-diff">Difficulty</label>' +
        '<select class="select" id="gen-diff"><option>Beginner</option><option selected>Intermediate</option><option>Advanced</option></select></div>' +
        '<button class="btn btn-primary btn-block btn-lg" type="submit">Generate Path</button>' +
        '<div class="modal-actions"><button class="btn btn-secondary btn-block" type="button" data-action="close-modal">Cancel</button></div>' +
        "</form>";
    } else if (g.step === "quiz") {
  var qs = (g.quiz && g.quiz.questions) || [];
  var current = g.currentQuestion || 0;
  var q = qs[current] || {
    question: "",
    options: []
};
  var progress = qs.length
    ? Math.round(((current + 1) / qs.length) * 100)
    : 0;
  inner =
    '<h2>Quick Skill Quiz</h2>' +
    '<p class="sub">Question ' + (current + 1) + ' of ' + qs.length + '</p>' +

    '<div class="progress" style="margin-bottom:20px">' +
    '<i style="width:' + progress + '%"></i>' +
    '</div>' +

    '<form id="quiz-form" novalidate>' +

    '<div class="quiz-q">' +
      '<p class="quiz-q-text">' +
        (current + 1) + '. ' + esc(q.question) +
      '</p>' +

      '<div class="quiz-options">' +

      (q.options || []).map(function(opt, oi) {

        var checked = g.answers[current] === oi ? "checked" : "";

        return (
          '<label class="quiz-option">' +
          '<input type="radio" name="quiz-current" value="' + oi + '" ' + checked + '>' +
          ' ' + esc(opt) +
          '</label>'
        );

      }).join("") +

      '</div>' +

    '</div>' +

'<div class="modal-actions" style="display:flex;justify-content:space-between;margin-top:20px;">' +

'<button class="btn btn-secondary" type="button" data-action="prev-question" ' +
(current === 0 ? 'disabled' : '') +
'>← Previous</button>' +

(
    current < qs.length - 1
        ? '<button class="btn btn-primary" type="button" data-action="next-question">Next →</button>'
        : '<button class="btn btn-primary" type="submit">Finish Quiz</button>'
) +

'</div>' +

    '</form>';

        
    } else if (g.step === "result") {
      inner =
        '<h2>Your Estimated Level</h2>' +
        '<p class="sub">Based on your quiz answers for “' + esc(g.topic) + '”.</p>' +
        '<div class="quiz-result-badge badge-' + esc((g.level || "intermediate").toLowerCase()) + '">' + esc(g.level || "Intermediate") + "</div>" +
        '<div class="field" style="margin-top:18px"><label for="gen-diff-confirm">Use this difficulty (or override)</label>' +
        '<select class="select" id="gen-diff-confirm">' +
        ["Beginner", "Intermediate", "Advanced"].map(function (d) {
          return "<option" + (d === g.level ? " selected" : "") + ">" + d + "</option>";
        }).join("") +
        "</select></div>" +
        '<button class="btn btn-primary btn-block btn-lg" data-action="confirm-generate">Generate My Path</button>' +
        '<div class="modal-actions"><button class="btn btn-secondary btn-block" type="button" data-action="close-modal">Cancel</button></div>';
    } else if (g.step === "generating") {
      inner = '<h2>Building your path…</h2><p class="sub">This can take a few seconds.</p><div class="gen-loading"><span class="spinner big"></span></div>';
    }
    return '<div class="overlay" data-overlay role="dialog" aria-modal="true" aria-labelledby="gen-title"><div class="modal">' + inner + "</div></div>";
  }

  /* ---------------- render ---------------- */
  function render() {
    app.innerHTML = state.token && state.user ? appView() : authView();
    modalRoot.innerHTML = state.modal === "generate" ? generateModal() : "";
    if (state.modal === "generate") {
      var t = document.getElementById("gen-topic");
      if (t) t.focus();
    }
    if (state.route === "chat") {
      var box = document.getElementById("chat-messages");
      if (box) box.scrollTop = box.scrollHeight;
      var ci = document.getElementById("chat-input");
      if (ci) ci.focus();
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
    var overview = p.overview || "";
    var modules = p.modules || [];
    if (!modules.length && (p.content || p.body)) {
      var legacy = p.content || p.body;
      if (typeof legacy === "string") {
        modules = [{ title: "Learning Path", content: legacy, resources: [], exercises: [] }];
      } else if (Array.isArray(legacy)) {
        modules = [{ title: "Learning Path", content: legacy.map(function (b) { return b.text || (b.items || []).join(", "); }).join("\n\n"), resources: [], exercises: [] }];
      }
    }
    return {
      id: p.id != null ? p.id : String(Date.now() + Math.random()),
      topic: p.topic || "Untitled path",
      difficulty_level: p.difficulty_level || p.difficulty || "Intermediate",
      goals: p.goals || "",
      created_at: p.created_at || p.createdAt || new Date().toISOString(),
      progress: typeof p.progress === "number" ? p.progress : 0,
      status: p.status || "in_progress",
      overview: overview,
      modules: modules,
      completed_modules: p.completed_modules || [],
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

    var modToggle = e.target.closest('[data-action="toggle-module-open"]');
    if (modToggle) {
        var key = modToggle.dataset.id + ":" + modToggle.dataset.idx;
        state.openModules[key] = !state.openModules[key];
        render();
        return;
    }

    var act = e.target.closest("[data-action]");

    if (!act) {
        if (e.target.hasAttribute && e.target.hasAttribute("data-overlay")) {
            state.modal = null;
            state.gen = {
                step: "form",
                topic: "",
                difficulty: "Intermediate",
                goals: "",
                quiz: null,
                answers: [],
                currentQuestion: 0,
                level: null,
                busy: false,
                error: ""
            };
            render();
        }
        return;
    }

    var action = act.dataset.action;

    if (action === "logout") {

        logout();

    } else if (action === "toggle-sidebar") {

        state.sidebarOpen = !state.sidebarOpen;
        render();

    } else if (action === "open-generate") {

        state.modal = "generate";
        state.gen = {
            step: "form",
            topic: "",
            difficulty: "Intermediate",
            goals: "",
            quiz: null,
            answers: [],
            currentQuestion: 0,
            level: null,
            busy: false,
            error: ""
        };
        render();

    } else if (action === "close-modal") {

        state.modal = null;
        render();

    } else if (action === "skip-quiz") {

        var topicInput = document.getElementById("gen-topic");
        if (topicInput) state.gen.topic = topicInput.value.trim();

        var goalsInput = document.getElementById("gen-goals");
        if (goalsInput) state.gen.goals = goalsInput.value.trim();

        if (!state.gen.topic) {
            state.gen.step = "form";
            render();
            fieldError("gen-topic", "Please enter a topic.");
            return;
        }

        state.gen.step = "manual";
        render();

    } else if (action === "next-question") {

    var selected = document.querySelector('input[name="quiz-current"]:checked');

    if (!selected) {
        toast("Please select an answer first.", "error");
        return;
    }

    state.gen.answers[state.gen.currentQuestion] =
        parseInt(selected.value, 10);

    if (state.gen.currentQuestion < state.gen.quiz.questions.length - 1) {
        state.gen.currentQuestion++;
    };

    render();

    // Focus the first option of the next question
    setTimeout(function () {

        var first = document.querySelector('input[name="quiz-current"]');

        if (first) {
            first.focus();
        }

    }, 0);
} else if (action === "prev-question") {

        var selectedPrev = document.querySelector('input[name="quiz-current"]:checked');

        if (selectedPrev) {
            state.gen.answers[state.gen.currentQuestion] =
                parseInt(selectedPrev.value, 10);
        }

        if (state.gen.currentQuestion > 0) {
            state.gen.currentQuestion--;
        }

        render();

    } else if (action === "confirm-generate") {

        var sel = document.getElementById("gen-diff-confirm");

        finalizeGenerate(
            sel ? sel.value : state.gen.level || "Intermediate"
        );

    } else if (action === "complete") {

        completePath(act, act.dataset.id);

    } else if (action === "delete-path") {

        deletePath(act.dataset.id);

    } else if (action === "delete-account") {

        if (window.confirm("Delete your account and all learning paths? This cannot be undone.")) {

            localStorage.removeItem(LOCAL_PATHS);

            logout(true);

            toast("Account deleted.", "error");
        }
    }

});

  document.addEventListener("change", function (e) {

    if (e.target.name === "quiz-current") {
        state.gen.answers[state.gen.currentQuestion] =
            parseInt(e.target.value, 10);
        return;
    }

    var chk = e.target.closest('[data-action="toggle-module-done"]');

    if (chk) {
        toggleModuleDone(
            chk.dataset.id,
            parseInt(chk.dataset.idx, 10),
            chk.checked
        );
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
    else if (form.id === "gen-form") { e.preventDefault(); startQuiz(form); }
    else if (form.id === "gen-manual-form") { e.preventDefault(); finalizeGenerate(document.getElementById("gen-diff").value); }
    else if (form.id === "quiz-form") { e.preventDefault(); scoreQuiz(form); }
    else if (form.id === "pw-form") { e.preventDefault(); doChangePassword(form); }
    else if (form.id === "chat-form") { e.preventDefault(); sendChat(form); }
  });

  /* ---------------- handlers: auth ---------------- */
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

  /* ---------------- handlers: generate + quiz wizard ---------------- */
  function startQuiz(form) {
    alertIn("gen-alert", "");
    var topic = document.getElementById("gen-topic").value.trim();
    var goals = document.getElementById("gen-goals").value.trim();
    if (!fieldError("gen-topic", topic.length >= 2 ? "" : "Please enter a topic.")) return;
    state.gen.topic = topic;
    state.gen.goals = goals;

    var btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, "Preparing quiz…");
    request("/ai/quiz", { method: "POST", body: { topic: topic, num_questions: 5 } })
      .then(function (data) {
        state.gen.quiz = data;
        state.gen.answers = new Array((data.questions || []).length).fill(null);
        state.gen.currentQuestion = 0;
        state.gen.step = "quiz";
        render();
      })
      .catch(function (err) {
        if (isUnavailable(err)) {
          var q = demoQuiz(topic);
          state.gen.quiz = q;
          state.gen.answers = new Array(q.questions.length).fill(null);
          state.gen.currentQuestion = 0;
          state.gen.step = "quiz";
          render();
        } else {
          setBusy(btn, false);
          alertIn("gen-alert", err.message);
        }
      });
  }

  function scoreQuiz(form) {

    var selected = document.querySelector('input[name="quiz-current"]:checked');

    if (selected) {
        state.gen.answers[state.gen.currentQuestion] =
            parseInt(selected.value, 10);
    }

    var qs = state.gen.quiz.questions || [];
    var answers = state.gen.answers;

    var correct = 0;
    var levelScore = {
        beginner: 0,
        intermediate: 0,
        advanced: 0
    };

    qs.forEach(function (q, qi) {

        if (answers[qi] === q.correct_index) {

            correct++;

            var lvl = (q.level || "intermediate").toLowerCase();

            if (levelScore[lvl] != null) {
                levelScore[lvl]++;
            }
        }

    });

    var pct = qs.length ? correct / qs.length : 0;

    var level =
        pct >= 0.75 ? "Advanced" :
        pct >= 0.40 ? "Intermediate" :
        "Beginner";

    state.gen.level = level;
    state.gen.step = "result";

    render();
}

  function finalizeGenerate(difficulty) {
    var g = state.gen;
    g.step = "generating";
    render();
    request("/ai/generate-path", {
      method: "POST",
      body: { topic: g.topic, difficulty_level: difficulty, goals: g.goals, skill_level: difficulty },
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
              topic: g.topic,
              difficulty_level: difficulty,
              goals: g.goals,
              created_at: new Date().toISOString(),
              progress: 0,
              overview: demoContent(g.topic, difficulty, g.goals).overview,
              modules: demoContent(g.topic, difficulty, g.goals).modules,
              completed_modules: [],
            })
          );
          persistLocal();
        } else {
          g.step = "result";
          render();
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

  /* ---------------- handlers: path actions ---------------- */
  function completePath(btn, id) {
    var p = state.paths.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!p) return;
    setBusy(btn, true, "Saving…");
    request("/learning-paths/" + id, { method: "PATCH", body: { progress: 100 } })
      .catch(function () { /* offline fallback */ })
      .then(function () {
        p.progress = 100;
        p.completed_modules = (p.modules || []).map(function (_, i) { return i; });
        persistLocal();
        toast("Marked as completed 🎉", "success");
        render();
      });
  }

  function toggleModuleDone(id, idx, checked) {
    var p = state.paths.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!p) return;
    var set = {};
    (p.completed_modules || []).forEach(function (i) { set[i] = true; });
    if (checked) set[idx] = true; else delete set[idx];
    p.completed_modules = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    var total = (p.modules || []).length;
    p.progress = total ? Math.round((p.completed_modules.length / total) * 100) : 0;
    render();

    request("/learning-paths/" + id + "/modules/" + idx, { method: "PATCH", body: { completed: checked } })
      .catch(function () { /* offline fallback — local state already updated */ })
      .then(function () {
        persistLocal();
      });
  }

  function deletePath(id) {
    if (!window.confirm("Delete this learning path? This cannot be undone.")) return;
    request("/learning-paths/" + id, { method: "DELETE" })
      .catch(function () { /* offline fallback */ })
      .then(function () {
        state.paths = state.paths.filter(function (x) { return String(x.id) !== String(id); });
        persistLocal();
        if (String(state.pathId) === String(id)) {
          state.route = "dashboard";
          state.pathId = null;
        }
        toast("Learning path deleted.", "success");
        render();
      });
  }

  /* ---------------- handlers: settings ---------------- */
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

  /* ---------------- handlers: chat ---------------- */
  function sendChat(form) {
    var input = document.getElementById("chat-input");
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    var history = state.chat.messages.slice();
    state.chat.messages.push({ role: "user", content: text });
    state.chat.sending = true;
    render();

    request("/chat", { method: "POST", body: { message: text, history: history } })
      .then(function (data) {
        state.chat.messages.push({ role: "assistant", content: data.reply || "…" });
      })
      .catch(function (err) {
        if (err.status === 401) return;
        state.chat.messages.push({
          role: "assistant",
          content: isUnavailable(err)
            ? "I can't reach the AI service right now — check back in a bit."
            : "Something went wrong: " + err.message,
        });
      })
      .then(function () {
        state.chat.sending = false;
        render();
      });
  }

  /* ---------------- boot ---------------- */
  render();
  if (state.token && state.user) loadPaths();
})();
