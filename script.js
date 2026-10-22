/* ==========================================================
   SIGMA KEY — CYBER TYPING ARENA
   Configure Supabase URL + public/publishable key below.
   Never put a service_role/secret key in browser code.
   ========================================================== */

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";

const WORDS = [
  "access", "admin", "algorithm", "analyze", "anonymous", "archive",
  "artificial", "backup", "binary", "breach", "browser", "buffer",
  "cipher", "client", "cloud", "command", "compile", "console",
  "control", "core", "crypto", "cyber", "data", "database", "debug",
  "decode", "deploy", "device", "digital", "domain", "download",
  "encrypt", "engine", "execute", "exploit", "firewall", "framework",
  "gateway", "hacker", "hash", "host", "initialize", "input",
  "interface", "kernel", "key", "logic", "machine", "matrix",
  "memory", "mission", "module", "network", "node", "operation",
  "packet", "password", "payload", "process", "protocol", "proxy",
  "quantum", "query", "reboot", "remote", "request", "response",
  "root", "router", "runtime", "scan", "script", "secure",
  "server", "session", "signal", "socket", "source", "system",
  "terminal", "thread", "token", "trace", "transfer", "update",
  "upload", "user", "vector", "virtual", "virus", "void",
  "watchdog", "web", "wireless", "zero", "accesspoint", "firewall",
  "permission", "security", "authentication", "encryption", "networking"
];

const SYMBOLS = [
  "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "-",
  "+", "=", "[", "]", "{", "}", ";", ":", ",", ".", "?", "/", "\\"
];

const $ = (id) => document.getElementById(id);

const state = {
  words: 50,
  seconds: 60,
  mode: "words",
  caseMode: "strict",
  target: "",
  started: false,
  finished: false,
  startTime: 0,
  endTime: 0,
  timerId: null,
  mistakes: 0,
  totalKeys: 0,
  lastTyped: "",
  results: readLocalResults(),
  user: null,
  profileName: "",
  authMode: "signin"
};

let supabaseClient = null;

const hasSupabaseConfig =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_URL.includes("YOUR_SUPABASE") &&
  !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");

if (hasSupabaseConfig && window.supabase?.createClient) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

/* -------------------- MATRIX BACKGROUND -------------------- */

(function initMatrix() {
  const canvas = $("matrix");
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let columns = 0;
  let drops = [];

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    columns = Math.ceil(width / 17);
    drops = Array.from({ length: columns }, () => Math.random() * height / 17);
  }

  function draw() {
    ctx.fillStyle = "rgba(2, 8, 5, 0.12)";
    ctx.fillRect(0, 0, width, height);
    ctx.font = "13px Consolas, monospace";

    for (let i = 0; i < drops.length; i++) {
      const digit = Math.random() > 0.5 ? "1" : "0";
      ctx.fillStyle = Math.random() > 0.93
        ? "rgba(145,255,190,0.9)"
        : "rgba(38,255,126,0.52)";
      ctx.fillText(digit, i * 17, drops[i] * 17);

      if (drops[i] * 17 > height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += 0.34 + Math.random() * 0.45;
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
})();

/* -------------------- NAVIGATION -------------------- */

function switchPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === `page-${pageName}`);
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });

  if (pageName === "results") renderHistory();
  if (pageName === "records") loadLeaderboard();
}

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    switchPage(button.dataset.page);
  });
});

/* -------------------- SETTINGS -------------------- */

function selectedWordCount() {
  const choice = $("wordCountSetting").value;
  if (choice === "custom") {
    const custom = Number($("customWords").value);
    return Math.max(
      1,
      Math.min(5000, Number.isFinite(custom) ? Math.floor(custom) : 20)
    );
  }
  return Number(choice);
}

function selectedTime() {
  const choice = $("timeSetting").value;
  if (choice === "custom") {
    const custom = Number($("customTime").value);
    return Math.max(
      10,
      Math.min(3600, Number.isFinite(custom) ? Math.floor(custom) : 60)
    );
  }
  return Number(choice);
}

$("wordCountSetting").addEventListener("change", () => {
  $("customWordsRow").classList.toggle(
    "hidden",
    $("wordCountSetting").value !== "custom"
  );
});

$("timeSetting").addEventListener("change", () => {
  $("customTimeRow").classList.toggle(
    "hidden",
    $("timeSetting").value !== "custom"
  );
});

$("saveSettingsBtn").addEventListener("click", () => {
  state.words = selectedWordCount();
  state.seconds = selectedTime();
  state.mode = $("modeSetting").value;
  state.caseMode = $("caseSetting").value;

  $("settingsMessage").textContent =
    `Settings saved: ${state.words} words / ${state.seconds} seconds.`;

  if (!state.started) prepareMission();
  updateTopStats();
});

/* -------------------- MISSION TEXT -------------------- */

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumberToken() {
  const length = 2 + Math.floor(Math.random() * 6);
  let output = "";

  for (let i = 0; i < length; i++) {
    output += Math.floor(Math.random() * 10);
  }

  return output;
}

function randomSymbolToken() {
  let output = "";
  const length = 3 + Math.floor(Math.random() * 5);

  for (let i = 0; i < length; i++) {
    output += randomItem(SYMBOLS);
  }

  return output;
}

function makeToken() {
  if (state.mode === "numbers") return randomNumberToken();
  if (state.mode === "symbols") return randomSymbolToken();

  if (state.mode === "mixed") {
    const kind = Math.floor(Math.random() * 3);

    if (kind === 0) return randomNumberToken();
    if (kind === 1) return randomSymbolToken();

    return randomItem(WORDS);
  }

  return randomItem(WORDS);
}

function makeTarget() {
  return Array.from({ length: state.words }, makeToken).join(" ");
}

function prepareMission() {
  stopTimer();

  state.target = makeTarget();
  state.started = false;
  state.finished = false;
  state.startTime = 0;
  state.endTime = 0;
  state.mistakes = 0;
  state.totalKeys = 0;
  state.lastTyped = "";

  $("typingInput").value = "";
  $("typingInput").disabled = true;
  $("inputStatus").textContent = "LOCKED";
  $("missionHint").textContent = "Press START MISSION to begin.";
  $("timeLeft").innerHTML = `${state.seconds}<span>s</span>`;
  $("wpm").innerHTML = `0 <span>WPM</span>`;
  $("accuracy").innerHTML = `100<span>%</span>`;
  $("mistakes").innerHTML = `0 <span>/ 5 MAX</span>`;
  $("charCount").textContent = "0";
  $("wordCount").textContent = `0 / ${state.words}`;
  $("resultOverlay").classList.add("hidden");
  $("resultOverlay").classList.remove("failed");
  $("startBtn").disabled = false;
  $("startBtn").textContent = "▶ START MISSION";

  renderTarget("");
}

function renderTarget(typedText) {
  const target = state.target;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < target.length; i++) {
    const span = document.createElement("span");
    span.textContent = target[i];

    if (i < typedText.length) {
      const typedChar = typedText[i];
      const targetChar = target[i];

      const correct = state.caseMode === "ignore"
        ? typedChar.toLowerCase() === targetChar.toLowerCase()
        : typedChar === targetChar;

      span.className = correct ? "typed-correct" : "typed-wrong";
    } else if (
      i === typedText.length &&
      state.started &&
      !state.finished
    ) {
      span.className = "next-char";
    }

    fragment.appendChild(span);
  }

  $("targetText").replaceChildren(fragment);
}

function startMission() {
  if (state.started && !state.finished) return;

  state.words = selectedWordCount();
  state.seconds = selectedTime();
  state.mode = $("modeSetting").value;
  state.caseMode = $("caseSetting").value;

  prepareMission();

  state.started = true;
  state.startTime = Date.now();

  $("typingInput").disabled = false;
  $("typingInput").focus();
  $("inputStatus").textContent = "ACTIVE";
  $("missionHint").textContent =
    "MISSION ACTIVE // Type the target exactly.";
  $("startBtn").disabled = true;
  $("startBtn").textContent = "MISSION RUNNING";

  state.timerId = window.setInterval(updateTimer, 100);
  renderTarget("");
}

function stopTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function elapsedSeconds() {
  if (!state.startTime) return 0;

  const end = state.finished ? state.endTime : Date.now();

  return Math.max(0.001, (end - state.startTime) / 1000);
}

function getTyped() {
  return $("typingInput").value;
}

function compareChars(a, b) {
  if (state.caseMode === "ignore") {
    return a.toLowerCase() === b.toLowerCase();
  }

  return a === b;
}

function isTargetComplete(typed) {
  if (typed.length !== state.target.length) {
    return false;
  }

  return state.caseMode === "ignore"
    ? typed.toLowerCase() === state.target.toLowerCase()
    : typed === state.target;
}

function countCorrectChars(typed) {
  let correct = 0;

  for (let i = 0; i < Math.min(typed.length, state.target.length); i++) {
    if (compareChars(typed[i], state.target[i])) {
      correct++;
    }
  }

  return correct;
}

function getWpm() {
  const correct = countCorrectChars(getTyped());

  return Math.round((correct / 5) / (elapsedSeconds() / 60));
}

function getAccuracy() {
  if (state.totalKeys === 0) return 100;

  return Math.max(
    0,
    Math.round(((state.totalKeys - state.mistakes) / state.totalKeys) * 100)
  );
}

function getScore(wpm, accuracy, won) {
  const base = Math.round(wpm * accuracy);

  return won
    ? Math.max(0, base)
    : Math.max(0, Math.round(base * 0.25));
}

/* -------------------- TIMER -------------------- */

function updateTimer() {
  if (!state.started || state.finished) return;

  const elapsed = (Date.now() - state.startTime) / 1000;
  const remaining = Math.max(0, state.seconds - elapsed);

  $("timeLeft").innerHTML = `${Math.ceil(remaining)}<span>s</span>`;

  updateLiveStats();

  if (state.mistakes > 5) {
    finishMission(false, "FAILED: MORE THAN 5 MISTAKES");
    return;
  }

  if (remaining <= 0) {
    const typed = getTyped();
    const complete = isTargetComplete(typed);
    const success = complete && state.mistakes <= 5;

    finishMission(
      success,
      success ? "MISSION COMPLETE" : "TIME EXPIRED"
    );
  }
}

function updateLiveStats() {
  const typed = getTyped();
  const wpm = getWpm();
  const accuracy = getAccuracy();

  const completedWords = typed.trim()
    ? typed.trim().split(/\s+/).length
    : 0;

  $("wpm").innerHTML = `${wpm} <span>WPM</span>`;
  $("accuracy").innerHTML = `${accuracy}<span>%</span>`;
  $("mistakes").innerHTML = `${state.mistakes} <span>/ 5 MAX</span>`;
  $("charCount").textContent = String(typed.length);
  $("wordCount").textContent =
    `${Math.min(completedWords, state.words)} / ${state.words}`;
}

/* -------------------- TYPING INPUT -------------------- */

$("typingInput").addEventListener("input", () => {
  if (!state.started || state.finished) return;

  const typed = getTyped();
  const previous = state.lastTyped;

  // Count each newly entered character against its expected position.
  // Corrections do not erase mistakes already made.
  if (typed.length > previous.length) {
    for (let i = previous.length; i < typed.length; i++) {
      state.totalKeys++;

      if (
        i >= state.target.length ||
        !compareChars(typed[i], state.target[i])
      ) {
        state.mistakes++;
      }
    }
  }

  state.lastTyped = typed;

  renderTarget(typed);
  updateLiveStats();

  if (state.mistakes > 5) {
    finishMission(false, "FAILED: MORE THAN 5 MISTAKES");
    return;
  }

  /*
    FIX:
    Check the completed target immediately.
    SUCCESS appears if the target is correct, time remains,
    and the player has made no more than 5 mistakes.
  */
  if (isTargetComplete(typed)) {
    const elapsed = (Date.now() - state.startTime) / 1000;
    const remaining = state.seconds - elapsed;

    if (state.mistakes > 5) {
      finishMission(false, "FAILED: MORE THAN 5 MISTAKES");
    } else if (remaining > 0) {
      finishMission(true, "MISSION COMPLETE");
    } else {
      finishMission(false, "TIME EXPIRED");
    }
  }
});

/* -------------------- RESULTS -------------------- */

function finishMission(success, message) {
  if (state.finished) return;

  state.finished = true;
  state.endTime = Date.now();
  state.started = false;

  stopTimer();

  const typed = getTyped();
  const wpm = getWpm();
  const accuracy = getAccuracy();
  const score = getScore(wpm, accuracy, success);
  const elapsed = Math.min(
    state.seconds,
    Math.round(elapsedSeconds())
  );

  $("typingInput").disabled = true;
  $("inputStatus").textContent = "LOCKED";
  $("startBtn").disabled = false;
  $("startBtn").textContent = "▶ START NEW MISSION";

  const overlay = $("resultOverlay");

  overlay.classList.remove("hidden");
  overlay.classList.toggle("failed", !success);

  $("resultWord").textContent = success ? "SUCCESS" : "FAILED";
  $("resultMessage").textContent = message;
  $("finalWpm").textContent = `${wpm} WPM`;
  $("finalScore").textContent = String(score);
  $("finalMistakes").textContent = String(state.mistakes);

  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    result: success ? "SUCCESS" : "FAILED",
    words: state.words,
    wpm,
    accuracy,
    mistakes: state.mistakes,
    score,
    seconds: elapsed,
    mode: state.mode,
    typedLength: typed.length,
    targetLength: state.target.length
  };

  state.results.unshift(record);
  state.results = state.results.slice(0, 100);

  writeLocalResults();
  renderHistory();
  updateTopStats();

  if (success && state.user && supabaseClient) {
    publishScore(record).catch((error) => {
      console.error("Could not publish score:", error);

      $("recordsStatus").textContent =
        "Your local result was saved, but publishing to the shared leaderboard failed.";
    });
  }
}

$("startBtn").addEventListener("click", startMission);
$("resetBtn").addEventListener("click", prepareMission);

$("overlayRetry").addEventListener("click", () => {
  prepareMission();
  startMission();
});

/* -------------------- LOCAL HISTORY -------------------- */

function readLocalResults() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("sigmaKeyResults") || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeLocalResults() {
  try {
    localStorage.setItem(
      "sigmaKeyResults",
      JSON.stringify(state.results)
    );
  } catch (error) {
    console.warn("Local history could not be saved.", error);
  }
}

function bestLocal(field) {
  return state.results.reduce(
    (best, row) => Math.max(best, Number(row[field]) || 0),
    0
  );
}

function updateTopStats() {
  $("bestWpm").innerHTML = `${bestLocal("wpm")} <i>WPM</i>`;
  $("bestScore").textContent = String(bestLocal("score"));

  $("recordBestWpm").innerHTML =
    `${bestLocal("wpm")} <span>WPM</span>`;

  $("recordBestScore").textContent = String(bestLocal("score"));
}

function renderHistory() {
  const tbody = $("historyBody");

  tbody.replaceChildren();

  if (!state.results.length) {
    const tr = document.createElement("tr");

    tr.innerHTML =
      '<td colspan="7" class="muted">No records yet.</td>';

    tbody.appendChild(tr);

    $("latestReport").innerHTML =
      '<p class="muted">No mission completed yet. Complete a mission to see your report.</p>';

    return;
  }

  const latest = state.results[0];

  $("latestReport").innerHTML = `
    <p class="eyebrow">// LATEST MISSION REPORT</p>
    <h2 class="${latest.result === "SUCCESS" ? "result-success" : "result-failed"}">${latest.result}</h2>
    <div class="metrics">
      <div class="metric"><small>SPEED</small><strong>${latest.wpm}<span> WPM</span></strong></div>
      <div class="metric"><small>SCORE</small><strong>${latest.score}</strong></div>
      <div class="metric"><small>ACCURACY</small><strong>${latest.accuracy}<span>%</span></strong></div>
      <div class="metric"><small>MISTAKES</small><strong>${latest.mistakes}</strong></div>
    </div>
    <p class="muted small">Words configured: ${latest.words} · Time used: ${latest.seconds}s · Mode: ${escapeHTML(latest.mode)}</p>
  `;

  state.results.forEach((record) => {
    const tr = document.createElement("tr");
    const date = new Date(record.date).toLocaleString();

    tr.innerHTML = `
      <td>${escapeHTML(date)}</td>
      <td class="${record.result === "SUCCESS" ? "result-success" : "result-failed"}">${record.result}</td>
      <td>${record.words}</td>
      <td class="wpm-cell">${record.wpm}</td>
      <td>${record.accuracy}%</td>
      <td>${record.mistakes}</td>
      <td class="score-cell">${record.score}</td>
    `;

    tbody.appendChild(tr);
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

/* -------------------- SIGN IN / SIGN UP -------------------- */

function openAuthModal() {
  $("authModal").classList.remove("hidden");
  updateAuthModal();
}

function closeAuthModal() {
  $("authModal").classList.add("hidden");
}

function updateAuthModal() {
  const signedIn = Boolean(state.user);

  $("nameLabel").classList.toggle(
    "hidden",
    state.authMode !== "signup" || signedIn
  );

  $("playerName").classList.toggle(
    "hidden",
    state.authMode !== "signup" || signedIn
  );

  $("authForm").classList.toggle("hidden", signedIn);
  $("authModeBtn").classList.toggle("hidden", signedIn);
  $("signOutBtn").classList.toggle("hidden", !signedIn);

  $("authTitle").innerHTML = signedIn
    ? `PLAYER <span class="green">SIGNED IN</span>`
    : state.authMode === "signup"
      ? `CREATE <span class="green">ACCOUNT</span>`
      : `SIGN <span class="green">IN</span>`;

  $("authSubmitBtn").textContent =
    state.authMode === "signup" ? "CREATE ACCOUNT" : "SIGN IN";

  $("authMessage").textContent = signedIn
    ? `Signed in as ${state.profileName || state.user.email}.`
    : (
      supabaseClient
        ? ""
        : "Add your Supabase URL and public key in script.js first."
    );
}

$("signInBtn").addEventListener("click", openAuthModal);
$("closeAuthBtn").addEventListener("click", closeAuthModal);

$("authModal").addEventListener("click", (event) => {
  if (event.target === $("authModal")) {
    closeAuthModal();
  }
});

$("authModeBtn").addEventListener("click", () => {
  state.authMode = state.authMode === "signin" ? "signup" : "signin";

  $("authMessage").textContent = "";

  updateAuthModal();
});

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    $("authMessage").textContent =
      "Supabase is not configured yet. Add your project URL and public key.";

    return;
  }

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const displayName =
    $("playerName").value.trim() || email.split("@")[0];

  $("authMessage").textContent = "Please wait...";

  try {
    if (state.authMode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (error) throw error;

      if (data.user && data.session) {
        state.user = data.user;

        await saveProfile(displayName);

        state.profileName = displayName;

        $("authMessage").textContent =
          "Account created and signed in.";
      } else {
        $("authMessage").textContent =
          "Account request sent. Check your email to confirm, then sign in.";

        return;
      }
    } else {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      state.user = data.user;

      state.profileName =
        data.user.user_metadata?.display_name ||
        data.user.email.split("@")[0];

      await saveProfile(state.profileName);

      $("authMessage").textContent = "Signed in successfully.";
    }

    updateAuthButton();
    updateAuthModal();

    await loadLeaderboard();
  } catch (error) {
    $("authMessage").textContent =
      error.message || "Authentication failed.";
  }
});

async function saveProfile(displayName) {
  if (!supabaseClient || !state.user) return;

  const safeName =
    String(displayName || "Player").trim().slice(0, 24) || "Player";

  const { error } = await supabaseClient
    .from("sigma_profiles")
    .upsert({
      user_id: state.user.id,
      display_name: safeName,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id"
    });

  if (error) throw error;

  state.profileName = safeName;
}

$("signOutBtn").addEventListener("click", async () => {
  if (supabaseClient) {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      $("authMessage").textContent = error.message;
      return;
    }
  }

  state.user = null;
  state.profileName = "";

  updateAuthButton();
  updateAuthModal();
});

function updateAuthButton() {
  $("signInBtn").textContent = state.user
    ? `ACCOUNT: ${(state.profileName || state.user.email.split("@")[0]).slice(0, 12)}`
    : "SIGN IN";
}

/* -------------------- SUPABASE SESSION -------------------- */

async function initAuth() {
  if (!supabaseClient) {
    $("recordsStatus").textContent =
      "Shared leaderboard is not configured. Add Supabase URL/key and run the SQL setup.";

    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.warn("Could not load session:", error.message);
  }

  if (data?.session?.user) {
    state.user = data.session.user;

    state.profileName =
      state.user.user_metadata?.display_name ||
      state.user.email.split("@")[0];

    try {
      const { data: profile } = await supabaseClient
        .from("sigma_profiles")
        .select("display_name")
        .eq("user_id", state.user.id)
        .maybeSingle();

      if (profile?.display_name) {
        state.profileName = profile.display_name;
      }
    } catch (error) {
      console.warn(error);
    }

    updateAuthButton();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;

    if (!state.user) {
      state.profileName = "";
    }

    updateAuthButton();
  });

  await loadLeaderboard();
}

/* -------------------- SHARED LEADERBOARD -------------------- */

async function publishScore(record) {
  if (!supabaseClient || !state.user) return;

  const { error: profileError } = await supabaseClient
    .from("sigma_profiles")
    .upsert({
      user_id: state.user.id,
      display_name: state.profileName || state.user.email.split("@")[0],
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id"
    });

  if (profileError) throw profileError;

  const { error } = await supabaseClient
    .from("sigma_scores")
    .insert({
      user_id: state.user.id,
      result: record.result,
      wpm: record.wpm,
      score: record.score,
      accuracy: record.accuracy,
      mistakes: record.mistakes,
      words: record.words,
      created_at: record.date
    });

  if (error) throw error;

  $("recordsStatus").textContent =
    "Your result has been submitted to the shared leaderboard.";

  await loadLeaderboard();
}

async function loadLeaderboard() {
  if (!supabaseClient) {
    $("recordsStatus").textContent =
      "Supabase setup required. Local results are available in the Results tab.";

    return;
  }

  $("recordsStatus").textContent = "Loading shared records...";

  const tbody = $("recordsBody");

  tbody.innerHTML =
    '<tr><td colspan="5" class="muted">Loading leaderboard...</td></tr>';

  try {
    // First fetch each player's highest score.
    const { data: scores, error: scoreError } = await supabaseClient
      .from("sigma_scores")
      .select("user_id, wpm, score, accuracy, created_at")
      .eq("result", "SUCCESS")
      .order("score", {
        ascending: false
      })
      .limit(1000);

    if (scoreError) throw scoreError;

    const bestByUser = new Map();

    (scores || []).forEach((row) => {
      const existing = bestByUser.get(row.user_id);

      if (
        !existing ||
        Number(row.score) > Number(existing.score)
      ) {
        bestByUser.set(row.user_id, row);
      } else if (
        Number(row.score) === Number(existing.score) &&
        Number(row.wpm) > Number(existing.wpm)
      ) {
        bestByUser.set(row.user_id, row);
      }
    });

    const ranked = Array.from(bestByUser.values())
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 100);

    $("recordCount").textContent = String(ranked.length);

    tbody.replaceChildren();

    if (!ranked.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="muted">No shared successful records yet.</td></tr>';

      $("recordsStatus").textContent =
        "Complete a successful mission while signed in to publish a record.";

      return;
    }

    const userIds = [
      ...new Set(ranked.map((row) => row.user_id))
    ];

    const { data: profiles, error: profileError } = await supabaseClient
      .from("sigma_profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    if (profileError) throw profileError;

    const names = new Map(
      (profiles || []).map((profile) => [
        profile.user_id,
        profile.display_name
      ])
    );

    ranked.forEach((row, index) => {
      const tr = document.createElement("tr");

      const playerName = names.get(row.user_id) || "Player";

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHTML(playerName)}</td>
        <td class="wpm-cell">${Number(row.wpm) || 0}</td>
        <td class="score-cell">${Number(row.score) || 0}</td>
        <td>${Number(row.accuracy) || 0}%</td>
      `;

      tbody.appendChild(tr);
    });

    $("recordsStatus").textContent =
      `Showing ${ranked.length} players, ranked by their highest successful score.`;
  } catch (error) {
    console.error("Leaderboard error:", error);

    $("recordsStatus").textContent =
      `Could not load leaderboard: ${error.message || "check your Supabase setup and policies."}`;

    tbody.innerHTML =
      '<tr><td colspan="5" class="muted">Leaderboard could not be loaded.</td></tr>';
  }
}

$("refreshRecordsBtn").addEventListener("click", loadLeaderboard);

/* -------------------- INITIALIZE -------------------- */

function initialize() {
  state.words = selectedWordCount();
  state.seconds = selectedTime();
  state.mode = $("modeSetting").value;
  state.caseMode = $("caseSetting").value;

  prepareMission();
  renderHistory();
  updateTopStats();
  initAuth();
}

initialize();