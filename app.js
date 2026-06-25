document.addEventListener('DOMContentLoaded', function () {
  var screens = {
    dashboard: document.getElementById('screen-dashboard'),
    assignments: document.getElementById('screen-assignments'),
    detail: document.getElementById('screen-detail'),
    add: document.getElementById('screen-add')
  };

  var currentScreen = 'dashboard';
  var detailAssignmentId = null;
  var userEditedEstimate = false;

  // --- Auth ---

  var elLogin = document.getElementById('screen-auth-login');
  var elSignup = document.getElementById('screen-auth-signup');
  var elLoading = document.getElementById('loading-screen');
  var elApp = document.getElementById('app-container');

  function showAuthScreen() {
    elLogin.classList.remove('hidden');
    elSignup.classList.add('hidden');
    elLoading.classList.add('hidden');
    elApp.classList.add('hidden');
  }

  function showLoading() {
    elLogin.classList.add('hidden');
    elSignup.classList.add('hidden');
    elLoading.classList.remove('hidden');
    elApp.classList.add('hidden');
  }

  function showApp() {
    elLogin.classList.add('hidden');
    elSignup.classList.add('hidden');
    elLoading.classList.add('hidden');
    elApp.classList.remove('hidden');
  }

  async function onUserLoggedIn(user) {
    currentUser = user;
    showLoading();
    await loadUserData(user.id);
    showApp();
    var slider = document.getElementById('form-availability');
    var sliderValue = document.getElementById('slider-value');
    slider.value = appData.dailyAvailability;
    sliderValue.textContent = appData.dailyAvailability + ' hrs/day';
    navigateTo('dashboard');
  }

  async function handleLogin() {
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    var errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    if (!email || !password) {
      errorEl.textContent = 'Please enter your email and password.';
      return;
    }

    var btn = document.getElementById('login-btn');
    btn.textContent = 'Logging in...';
    btn.disabled = true;

    var res = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
    if (res.error) {
      errorEl.textContent = res.error.message;
      btn.textContent = 'Log in';
      btn.disabled = false;
      return;
    }
    btn.textContent = 'Log in';
    btn.disabled = false;
    await onUserLoggedIn(res.data.user);
  }

  async function handleSignup() {
    var email = document.getElementById('signup-email').value.trim();
    var password = document.getElementById('signup-password').value;
    var confirm = document.getElementById('signup-confirm').value;
    var errorEl = document.getElementById('signup-error');
    errorEl.textContent = '';

    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields.';
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters.';
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match.';
      return;
    }

    var btn = document.getElementById('signup-btn');
    btn.textContent = 'Creating account...';
    btn.disabled = true;

    var res = await supabaseClient.auth.signUp({ email: email, password: password });
    if (res.error) {
      errorEl.textContent = res.error.message;
      btn.textContent = 'Create account';
      btn.disabled = false;
      return;
    }
    btn.textContent = 'Create account';
    btn.disabled = false;

    if (res.data.user) {
      await onUserLoggedIn(res.data.user);
    } else {
      errorEl.textContent = 'Check your email to confirm your account.';
    }
  }

  async function handleLogout() {
    if (timerState.intervalId) clearInterval(timerState.intervalId);
    timerState.assignmentId = null;
    timerState.startTime = null;
    timerState.intervalId = null;
    await supabaseClient.auth.signOut();
    currentUser = null;
    appData.assignments = [];
    showAuthScreen();
  }

  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('signup-btn').addEventListener('click', handleSignup);

  document.getElementById('login-password').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('signup-confirm').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleSignup();
  });

  document.getElementById('show-signup').addEventListener('click', function (e) {
    e.preventDefault();
    elLogin.classList.add('hidden');
    elSignup.classList.remove('hidden');
  });
  document.getElementById('show-login').addEventListener('click', function (e) {
    e.preventDefault();
    elSignup.classList.add('hidden');
    elLogin.classList.remove('hidden');
  });

  document.getElementById('mobile-logout-btn').addEventListener('click', handleLogout);
  document.getElementById('sidebar-logout-btn').addEventListener('click', handleLogout);

  if (supabaseReady) {
    supabaseClient.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') showAuthScreen();
    });
  }

  // --- Init auth ---
  async function initAuth() {
    if (!supabaseReady) {
      showApp();
      navigateTo('dashboard');
      return;
    }
    try {
      var res = await supabaseClient.auth.getSession();
      if (res.data.session) {
        await onUserLoggedIn(res.data.session.user);
      } else {
        showAuthScreen();
      }
    } catch (e) {
      console.error('Auth init failed:', e);
      showAuthScreen();
    }
  }

  initAuth();

  // --- Navigation ---

  function navigateTo(screen, opts) {
    if (screen === 'detail' && opts && opts.assignmentId) {
      detailAssignmentId = opts.assignmentId;
    }
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.remove('active');
    });
    screens[screen].classList.add('active');
    currentScreen = screen;
    updateNav();
    renderCurrentScreen();
    if (opts && opts.startTimer && screen === 'detail') {
      startTimer(detailAssignmentId);
    }
    window.scrollTo(0, 0);
  }

  function updateNav() {
    var navMap = { dashboard: 'dashboard', assignments: 'assignments', detail: 'assignments', add: 'add' };
    var activeKey = navMap[currentScreen] || currentScreen;
    document.querySelectorAll('.nav-item').forEach(function (el) {
      el.classList.toggle('active', el.dataset.screen === activeKey);
    });
    document.querySelectorAll('.sidebar-link').forEach(function (el) {
      el.classList.toggle('active', el.dataset.screen === activeKey);
    });
  }

  function getAssignment(id) {
    return appData.assignments.find(function (a) { return a.id === id; });
  }

  function getActiveAssignments() {
    return appData.assignments.filter(function (a) { return !a.completed; });
  }

  function toDate(d) {
    return d instanceof Date ? d : new Date(d);
  }

  // --- ETA ---

  function calcETA(a) {
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var elapsed = getTimerElapsedHours(a.id);
    var logged = a.hoursLogged + elapsed;
    var remaining = Math.max(0, a.estimatedHours - logged);
    var diffMs = toDate(a.dueDate).getTime() - now.getTime();
    var daysRem = Math.max(0, Math.floor(diffMs / 86400000));
    var dueToday = daysRem === 0;
    var divisor = dueToday ? 0.5 : daysRem;
    var hpd = remaining / divisor;
    var avail = appData.dailyAvailability;
    var status, statusClass;
    if (logged >= a.estimatedHours) {
      status = 'complete';
      statusClass = 'green';
    } else if (hpd <= avail * 0.7) {
      status = 'on-track';
      statusClass = 'green';
    } else if (hpd <= avail) {
      status = 'at-risk';
      statusClass = 'amber';
    } else {
      status = 'behind';
      statusClass = 'red';
    }
    var urgency = hpd / avail;
    var progress = a.estimatedHours > 0 ? Math.min(1, logged / a.estimatedHours) : 1;
    return {
      hoursLogged: logged,
      hoursRemaining: remaining,
      daysRemaining: daysRem,
      dueToday: dueToday,
      hoursPerDay: hpd,
      status: status,
      statusClass: statusClass,
      urgency: urgency,
      progress: progress
    };
  }

  function getTimerElapsedHours(assignmentId) {
    if (timerState.assignmentId !== assignmentId || !timerState.startTime) return 0;
    return (Date.now() - timerState.startTime) / 3600000;
  }

  // --- Formatting ---

  function formatHours(h) {
    if (h < 0) h = 0;
    var hrs = Math.floor(h);
    var mins = Math.round((h - hrs) * 60);
    if (mins === 60) { hrs++; mins = 0; }
    if (hrs > 0 && mins > 0) return hrs + 'h ' + mins + 'm';
    if (hrs > 0) return hrs + 'h';
    if (mins > 0) return mins + 'm';
    return '0m';
  }

  function formatDate(d) {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
  }

  function formatTimer(ms) {
    var totalSecs = Math.floor(ms / 1000);
    var m = Math.floor(totalSecs / 60);
    var s = totalSecs % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function subjectBadgeHTML(subject) {
    var colors = SUBJECT_COLORS[subject] || SUBJECT_COLORS['Other'];
    return '<span class="subject-badge" style="background:' + colors.bg + ';color:' + colors.text + '">' + subject + '</span>';
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Dashboard ---

  function renderDashboard() {
    var active = getActiveAssignments();
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    var dueThisWeek = active.filter(function (a) { return toDate(a.dueDate) <= weekEnd; }).length;

    document.getElementById('stat-active').textContent = active.length;
    document.getElementById('stat-due-week').textContent = dueThisWeek;

    var sorted = active.map(function (a) {
      return { assignment: a, eta: calcETA(a) };
    }).sort(function (a, b) { return b.eta.urgency - a.eta.urgency; });

    var listEl = document.getElementById('dashboard-list');
    listEl.innerHTML = '';

    sorted.forEach(function (item) {
      var a = item.assignment;
      var eta = item.eta;
      var dueLabel = eta.dueToday ? 'Due today' : 'Due ' + formatDate(toDate(a.dueDate));
      var daysLabel = eta.dueToday ? '' : ' · ' + eta.daysRemaining + ' day' + (eta.daysRemaining !== 1 ? 's' : '') + ' left';
      var dailyLabel = eta.status === 'complete'
        ? 'Estimated hours complete'
        : 'Need ' + eta.hoursPerDay.toFixed(1) + ' hrs/day';

      var card = document.createElement('div');
      card.className = 'assignment-card';
      card.innerHTML =
        '<div class="assignment-card-header">' +
          '<div class="assignment-card-left">' +
            subjectBadgeHTML(a.subject) +
            '<div class="assignment-name">' + escapeHTML(a.name) + '</div>' +
            '<div class="assignment-due">' + dueLabel + daysLabel + '</div>' +
          '</div>' +
          '<div class="status-dot ' + eta.statusClass + '"></div>' +
        '</div>' +
        '<div class="progress-container">' +
          '<div class="progress-bar-bg"><div class="progress-bar-fill" style="width:' + (eta.progress * 100) + '%"></div></div>' +
          '<div class="progress-label">' + formatHours(eta.hoursLogged) + ' logged of ' + formatHours(a.estimatedHours) + ' estimated</div>' +
        '</div>' +
        '<div class="daily-needed ' + eta.statusClass + '">' + dailyLabel + '</div>' +
        '<div class="card-actions"><button class="btn-timer-small" data-id="' + a.id + '">&#9654; Start timer</button></div>';

      card.addEventListener('click', function (e) {
        if (e.target.closest('.btn-timer-small')) return;
        navigateTo('detail', { assignmentId: a.id });
      });
      card.querySelector('.btn-timer-small').addEventListener('click', function (e) {
        e.stopPropagation();
        navigateTo('detail', { assignmentId: a.id, startTimer: true });
      });
      listEl.appendChild(card);
    });

    var bannerEl = document.getElementById('nudge-banner');
    var redItem = sorted.find(function (i) { return i.eta.statusClass === 'red'; });
    var amberItem = sorted.find(function (i) { return i.eta.statusClass === 'amber'; });
    if (redItem) {
      bannerEl.className = 'nudge-banner red';
      bannerEl.textContent = "You're behind on " + redItem.assignment.name + ". Put time in today.";
      bannerEl.style.display = 'block';
    } else if (amberItem) {
      bannerEl.className = 'nudge-banner amber';
      bannerEl.textContent = "Keep an eye on " + amberItem.assignment.name + " — you're cutting it close.";
      bannerEl.style.display = 'block';
    } else if (sorted.length > 0) {
      bannerEl.className = 'nudge-banner green';
      bannerEl.textContent = "You're on track. Keep it up.";
      bannerEl.style.display = 'block';
    } else {
      bannerEl.style.display = 'none';
    }
  }

  // --- Assignments list ---

  function renderAssignmentsList() {
    var listEl = document.getElementById('assignments-list');
    listEl.innerHTML = '';
    var activeFirst = appData.assignments.slice().sort(function (a, b) {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return 0;
    });
    activeFirst.forEach(function (a) {
      var eta = a.completed ? null : calcETA(a);
      var row = document.createElement('div');
      row.className = 'assignment-list-row' + (a.completed ? ' completed' : '');
      row.innerHTML =
        '<div class="list-row-info">' +
          subjectBadgeHTML(a.subject) +
          '<div class="list-row-name">' + escapeHTML(a.name) + '</div>' +
          '<div class="list-row-due">Due ' + formatDate(toDate(a.dueDate)) + '</div>' +
        '</div>' +
        (eta ? '<div class="status-dot ' + eta.statusClass + '"></div>' : '');
      row.addEventListener('click', function () {
        navigateTo('detail', { assignmentId: a.id });
      });
      listEl.appendChild(row);
    });
  }

  // --- Detail view ---

  function renderDetail() {
    var a = getAssignment(detailAssignmentId);
    if (!a) return;
    var eta = calcETA(a);

    document.getElementById('detail-name').textContent = a.name;
    document.getElementById('detail-badge').innerHTML = subjectBadgeHTML(a.subject);
    document.getElementById('detail-estimated').textContent = formatHours(a.estimatedHours);
    document.getElementById('detail-logged').textContent = formatHours(eta.hoursLogged);
    document.getElementById('detail-remaining-hrs').textContent = formatHours(eta.hoursRemaining);
    document.getElementById('detail-remaining-days').textContent = eta.daysRemaining + ' day' + (eta.daysRemaining !== 1 ? 's' : '');

    var dailyBox = document.getElementById('detail-daily-box');
    if (eta.status === 'complete') {
      dailyBox.textContent = 'Estimated hours complete — review if needed';
    } else {
      dailyBox.textContent = 'You need ' + eta.hoursPerDay.toFixed(1) + ' hrs/day to finish on time';
    }
    dailyBox.className = 'daily-box ' + eta.statusClass;

    var timerBtn = document.getElementById('detail-timer-btn');
    var timerDisplay = document.getElementById('detail-timer-display');
    var isRunning = timerState.assignmentId === a.id && timerState.startTime;
    if (isRunning) {
      timerBtn.textContent = '■ Stop Timer';
      timerBtn.className = 'btn-primary btn-stop';
      timerDisplay.style.display = 'block';
      timerDisplay.textContent = formatTimer(Date.now() - timerState.startTime);
    } else {
      timerBtn.textContent = '▶ Start Timer';
      timerBtn.className = 'btn-primary';
      timerDisplay.style.display = 'none';
    }

    var completeBtn = document.getElementById('detail-complete-btn');
    completeBtn.style.display = a.completed ? 'none' : 'block';

    var sessionsEl = document.getElementById('detail-sessions');
    sessionsEl.innerHTML = '';
    if (a.sessions.length === 0) {
      sessionsEl.innerHTML = '<div class="no-sessions">No sessions logged yet.</div>';
    } else {
      var sorted = a.sessions.slice().sort(function (s1, s2) { return toDate(s2.date) - toDate(s1.date); });
      sorted.forEach(function (s) {
        var item = document.createElement('div');
        item.className = 'session-item';
        item.innerHTML =
          '<span class="session-date">' + formatDate(toDate(s.date)) + '</span>' +
          '<span class="session-duration">' + formatHours(s.durationHours) + '</span>';
        sessionsEl.appendChild(item);
      });
    }
  }

  // --- Timer ---

  function startTimer(assignmentId) {
    if (timerState.assignmentId && timerState.startTime) {
      stopTimer();
    }
    timerState.assignmentId = assignmentId;
    timerState.startTime = Date.now();
    timerState.intervalId = setInterval(function () {
      if (currentScreen === 'detail' && detailAssignmentId === assignmentId) {
        var display = document.getElementById('detail-timer-display');
        display.textContent = formatTimer(Date.now() - timerState.startTime);
        display.style.display = 'block';
        renderDetail();
      }
      if (currentScreen === 'dashboard') {
        renderDashboard();
      }
    }, 1000);
    renderCurrentScreen();
  }

  function stopTimer() {
    if (!timerState.assignmentId || !timerState.startTime) return;
    var a = getAssignment(timerState.assignmentId);
    var elapsed = (Date.now() - timerState.startTime) / 3600000;
    if (a && elapsed > 0.001) {
      a.hoursLogged += elapsed;
      var session = { date: new Date().toISOString(), durationHours: elapsed };
      a.sessions.push(session);
      saveSession(a.id, session);
      updateAssignmentHours(a.id, a.hoursLogged);
    }
    clearInterval(timerState.intervalId);
    timerState.assignmentId = null;
    timerState.startTime = null;
    timerState.intervalId = null;
    renderCurrentScreen();
  }

  document.getElementById('detail-timer-btn').addEventListener('click', function () {
    var a = getAssignment(detailAssignmentId);
    if (!a) return;
    if (timerState.assignmentId === a.id && timerState.startTime) {
      stopTimer();
    } else {
      startTimer(a.id);
    }
  });

  document.getElementById('detail-complete-btn').addEventListener('click', function () {
    var a = getAssignment(detailAssignmentId);
    if (!a) return;
    if (timerState.assignmentId === a.id) stopTimer();
    a.completed = true;
    markAssignmentComplete(a.id);
    navigateTo('assignments');
  });

  document.getElementById('detail-back-btn').addEventListener('click', function () {
    navigateTo('assignments');
  });

  // --- Navigation ---

  document.querySelectorAll('.nav-item, .sidebar-link').forEach(function (el) {
    el.addEventListener('click', function () {
      var target = el.dataset.screen;
      if (target) navigateTo(target);
    });
  });

  // --- Add assignment form ---

  var formType = document.getElementById('form-type');
  var formSize = null;
  var formEstimate = document.getElementById('form-estimate');
  var suggestionNote = document.getElementById('suggestion-note');

  document.querySelectorAll('.size-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.size-option').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      formSize = btn.dataset.size;
      updateSuggestion();
    });
  });

  formType.addEventListener('change', updateSuggestion);

  formEstimate.addEventListener('input', function () {
    userEditedEstimate = true;
    updateSuggestion();
  });

  function updateSuggestion() {
    var type = formType.value;
    if (!type || !formSize) {
      suggestionNote.textContent = '';
      return;
    }
    var table = ESTIMATE_TABLE[type];
    if (!table) { suggestionNote.textContent = ''; return; }
    var suggested = table[formSize];
    if (!suggested) { suggestionNote.textContent = ''; return; }

    if (!userEditedEstimate) {
      formEstimate.value = suggested;
      suggestionNote.textContent = 'Suggested: ' + suggested + ' hrs — you can change this.';
    } else {
      var current = parseFloat(formEstimate.value);
      if (current && current !== suggested) {
        suggestionNote.textContent = 'Suggested: ' + suggested + ' hrs (you\'ve set ' + current + ' hrs)';
      } else {
        suggestionNote.textContent = 'Suggested: ' + suggested + ' hrs';
      }
    }
  }

  var slider = document.getElementById('form-availability');
  var sliderValue = document.getElementById('slider-value');
  slider.addEventListener('input', function () {
    var val = parseFloat(slider.value);
    sliderValue.textContent = val + ' hrs/day';
    appData.dailyAvailability = val;
    if (currentUser) updateDailyAvailability(currentUser.id, val);
  });

  document.getElementById('add-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var valid = true;
    var name = document.getElementById('form-name').value.trim();
    var subject = document.getElementById('form-subject').value;
    var type = formType.value;
    var dateAssigned = document.getElementById('form-date-assigned').value;
    var dueDate = document.getElementById('form-due-date').value;
    var estimate = parseFloat(formEstimate.value);

    clearErrors();

    if (!name) { showError('form-name'); valid = false; }
    if (!subject) { showError('form-subject'); valid = false; }
    if (!type) { showError('form-type'); valid = false; }
    if (!dueDate) { showError('form-due-date'); valid = false; }
    if (!estimate || estimate <= 0) { showError('form-estimate'); valid = false; }
    if (dueDate && dateAssigned && new Date(dueDate) <= new Date(dateAssigned)) {
      showError('form-due-date');
      valid = false;
    }

    if (!valid) return;

    var newAssignment = {
      name: name,
      subject: subject,
      type: type,
      size: formSize || 'Medium',
      dateAssigned: dateAssigned || new Date().toISOString().split('T')[0],
      dueDate: dueDate,
      estimatedHours: estimate,
      hoursLogged: 0,
      completed: false,
      sessions: []
    };

    var newId = await saveAssignment(newAssignment);
    newAssignment.id = newId;
    appData.assignments.push(newAssignment);

    document.getElementById('add-form').reset();
    document.querySelectorAll('.size-option').forEach(function (b) { b.classList.remove('active'); });
    formSize = null;
    userEditedEstimate = false;
    suggestionNote.textContent = '';
    slider.value = appData.dailyAvailability;
    sliderValue.textContent = appData.dailyAvailability + ' hrs/day';
    var todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('form-date-assigned').value = todayStr;
    navigateTo('dashboard');
  });

  function showError(id) {
    var el = document.getElementById(id);
    el.classList.add('error');
    var errEl = el.parentElement.querySelector('.form-error');
    if (errEl) errEl.classList.add('visible');
  }

  function clearErrors() {
    document.querySelectorAll('.form-input, .form-select').forEach(function (el) {
      el.classList.remove('error');
    });
    document.querySelectorAll('.form-error').forEach(function (el) {
      el.classList.remove('visible');
    });
  }

  function renderCurrentScreen() {
    if (currentScreen === 'dashboard') renderDashboard();
    else if (currentScreen === 'assignments') renderAssignmentsList();
    else if (currentScreen === 'detail') renderDetail();
  }

  var todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('form-date-assigned').value = todayStr;
});
