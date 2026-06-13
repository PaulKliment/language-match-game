let words = [];

let gameState = {
  mode: "game",
  attempts: 0,
  correctAttempts: 0,
  selectedCategory: "all",
  selectedCount: 4,
  timeLeft: 60,
  score: 0,
  combo: 0,
  maxCombo: 0,
  isPaused: false,
  timerInterval: null,
};

const categoryLabels = {
  all: "Vše",
  animals: "Zvířata",
  things: "Věci",
  food: "Jídlo",
  clothes: "Oblečení",
  colours: "Barvy",
  sport: "Sporty",
  family: "Rodina",
  profession: "Povolání",
  countries: "Země"
};

const achievements = [
  {
    id: "perfect",
    title: "🏆 Perfekcionista",
    condition: () =>
      gameState.attempts > 0 &&
      Math.round((gameState.correctAttempts / gameState.attempts) * 100) === 100
  },
  {
    id: "combo5",
    title: "🔥 Combo Master",
    // FIX: was gameState.combo — which is 0 whenever the last action was a wrong match
    condition: () => gameState.maxCombo >= 5
  },
  {
    id: "score200",
    title: "⚡ Speed Runner",
    condition: () => gameState.score >= 200
  }
];

const correctSound = new Audio("sounds/correct.mp3");
const wrongSound = new Audio("sounds/wrong.mp3");
let soundEnabled = localStorage.getItem("soundEnabled") !== "false";

function playSound(sound) {
  if (!soundEnabled) return;
  sound.currentTime = 0;
  const playPromise = sound.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {});
  }
}

function vibrate(duration) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile && "vibrate" in navigator) {
    navigator.vibrate(duration);
  }
}

// FIX: removed null entries that referenced non-existent elements:
//   countBtn (#game-count-label), toggleHistoryBtn (#toggle-history),
//   historyBox (#history-box), themeToggleGame (#theme-toggle-game),
//   setupCountBtns (.setup-count) — all were null and caused crashes or silent failures.
// FIX: added gameoverTitle (#gameover-title) to match the new id in HTML.
const ui = {
  loadingScreen: document.getElementById("loading-screen"),
  menuScreen: document.getElementById("menu-screen"),
  gameScreen: document.getElementById("game-screen"),

  startGameBtn: document.getElementById("start-game"),
  startLearnBtn: document.getElementById("start-learn"),
  startTimerBtn: document.getElementById("start-timer"),

  backMenuBtn: document.getElementById("back-menu"),

  timerBox: document.getElementById("timer-box"),
  timerDisplay: document.getElementById("timer"),
  scoreBox: document.getElementById("score-box"),
  scoreDisplay: document.getElementById("score"),
  pauseBtn: document.getElementById("pause-btn"),
  comboDisplay: document.getElementById("combo"),
  comboPopup: document.getElementById("combo-popup"),
  floatingScoreContainer: document.getElementById("floating-score-container"),
  timerProgress: document.getElementById("timer-progress"),
  timerBar: document.getElementById("timer-bar"),

  czList: document.getElementById("cz-list"),
  enList: document.getElementById("en-list"),

  categoryBtn: document.getElementById("game-category-label"),

  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  modalOptions: document.getElementById("modal-options"),

  attemptsDisplay: document.getElementById("attempts"),
  accuracyDisplay: document.getElementById("accuracy"),
  lastScoreDisplay: document.getElementById("last-score"),
  highscoreDisplay: document.getElementById("highscore"),
  gamesPlayedDisplay: document.getElementById("games-played"),
  correctTotalDisplay: document.getElementById("correct-total"),
  bestComboDisplay: document.getElementById("best-combo"),
  bestScoreDisplay: document.getElementById("best-score"),

  historyList: document.getElementById("history"),

  gameOverScreen: document.getElementById("game-over"),
  finalScore: document.getElementById("final-score"),
  gameoverTitle: document.getElementById("gameover-title"),
  playAgainBtn: document.getElementById("play-again"),

  themeToggle: document.getElementById("theme-toggle"),
  soundToggle: document.getElementById("sound-toggle"),

  statsBtn: document.getElementById("stats-btn"),
  settingsBtn: document.getElementById("settings-btn"),
  statsModal: document.getElementById("stats-modal"),
  settingsModal: document.getElementById("settings-modal"),
  closeStats: document.getElementById("close-stats"),
  closeSettings: document.getElementById("close-settings"),

  startFromSetupBtn: document.getElementById("start-from-setup"),
  backToMenuSetupBtn: document.getElementById("back-to-menu-setup"),
  backToSetupGameoverBtn: document.getElementById("back-to-setup-gameover"),
  setupScreen: document.getElementById("setup-screen"),
  setupCategoryBtns: document.querySelectorAll(".setup-btn"),
  actionBar: document.getElementById("action-bar"),
};

let setupCategory = "all";
let first = null;
let second = null;
let isChecking = false;

// --- Event Listeners: Menus & Navigation ---

ui.startGameBtn.addEventListener("click", () => {
  // FIX: was missing this guard unlike the other two mode buttons
  if (words.length === 0) return;
  ui.menuScreen.style.display = "none";
  ui.setupScreen.style.display = "block";
  gameState.mode = "game";
});

ui.startLearnBtn.addEventListener("click", () => {
  if (words.length === 0) return;
  gameState.mode = "learn";
  ui.menuScreen.style.display = "none";
  ui.setupScreen.style.display = "block";
});

ui.startTimerBtn.addEventListener("click", () => {
  if (words.length === 0) return;
  gameState.mode = "timer";
  ui.menuScreen.style.display = "none";
  ui.setupScreen.style.display = "block";
});

ui.backMenuBtn.addEventListener("click", () => {
  document.getElementById("exit-modal").classList.remove("hidden");
});

const cancelExitBtn = document.getElementById("cancel-exit");
if (cancelExitBtn) {
  cancelExitBtn.addEventListener("click", () => {
    document.getElementById("exit-modal").classList.add("hidden");
  });
}

const confirmExitBtn = document.getElementById("confirm-exit");
if (confirmExitBtn) {
  confirmExitBtn.addEventListener("click", () => {
    document.getElementById("exit-modal").classList.add("hidden");
    clearInterval(gameState.timerInterval);
    ui.gameScreen.style.display = "none";
    ui.menuScreen.style.display = "flex";
  });
}

// --- Game Logic ---

function updateModeUI() {
  ui.timerBox.style.display = "none";
  ui.scoreBox.style.display = "none";
  ui.pauseBtn.style.display = "none";
  document.getElementById("combo-box").style.display = "none";
  ui.timerProgress.style.display = "none";

  const attemptsBox = document.getElementById("attempts-box");
  const accuracyBox = document.getElementById("accuracy-box");

  if (attemptsBox) attemptsBox.style.display = "block";
  if (accuracyBox) accuracyBox.style.display = "block";

  if (gameState.mode === "timer") {
    ui.timerBox.style.display = "block";
    ui.scoreBox.style.display = "block";
    ui.pauseBtn.style.display = "block";
    document.getElementById("combo-box").style.display = "block";
    ui.timerProgress.style.display = "block";
    if (attemptsBox) attemptsBox.style.display = "none";
    if (accuracyBox) accuracyBox.style.display = "none";
  } else if (gameState.mode === "learn") {
    if (attemptsBox) attemptsBox.style.display = "none";
    if (accuracyBox) accuracyBox.style.display = "none";
  }
}

function loadWords() {
  fetch("words.json")
    .then(response => response.json())
    .then(data => {
      words = data;
      ui.loadingScreen.style.display = "none";
    })
    .catch(error => {
      console.error("Chyba při načítání:", error);
      ui.loadingScreen.innerHTML = `
        <h2>❌ Chyba načítání</h2>
        <p>Zkus obnovit stránku.</p>
      `;
    });
}

function resetGameState() {
  clearInterval(gameState.timerInterval);

  gameState.timeLeft = 60;
  gameState.score = 0;
  gameState.combo = 0;
  gameState.maxCombo = 0;
  gameState.isPaused = false;
  gameState.attempts = 0;
  gameState.correctAttempts = 0;

  ui.timerDisplay.textContent = "60";
  ui.timerBar.style.width = "100%";
  ui.scoreDisplay.textContent = "0";
  ui.comboDisplay.textContent = "0";
  ui.pauseBtn.textContent = "⏸ Pauza";
  ui.attemptsDisplay.textContent = "0";
  ui.accuracyDisplay.textContent = "0%";

  first = null;
  second = null;
  isChecking = false;
}

function getSelectedWords() {
  const category = gameState.selectedCategory;
  const filteredWords = category === "all" ? words : words.filter(w => w.category === category);
  const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, gameState.selectedCount);
}

function renderWords(selectedWords, shuffledEn) {
  if (ui.gameScreen.style.display !== "block") return;

  selectedWords.forEach(word => {
    const div = document.createElement("div");
    div.textContent = word.cz;
    div.classList.add("word");
    div.dataset.value = word.en;
    div.dataset.type = "cz";
    ui.czList.appendChild(div);
  });

  shuffledEn.forEach(word => {
    const div = document.createElement("div");
    div.textContent = word.en;
    div.classList.add("word");
    div.dataset.value = word.en;
    div.dataset.type = "en";
    ui.enList.appendChild(div);
  });

  addListeners();
}

function initGame() {
  if (ui.gameScreen.style.display !== "block") return;

  ui.gameOverScreen.style.display = "none";
  // FIX: ensure "finished" class is always cleared on new game
  ui.gameScreen.classList.remove("finished");
  ui.czList.innerHTML = "";
  ui.enList.innerHTML = "";

  resetGameState();

  if (gameState.mode === "timer") {
    ui.timerBox.style.display = "block";
    ui.scoreBox.style.display = "block";
    startTimer();
  } else {
    ui.timerBox.style.display = "none";
    ui.scoreBox.style.display = "none";
  }

  const selectedWords = getSelectedWords();
  const shuffledEn = [...selectedWords].sort(() => Math.random() - 0.5);
  renderWords(selectedWords, shuffledEn);
}

function addListeners() {
  document.querySelectorAll(".word").forEach(el => {
    el.addEventListener("click", () => {
      if (isChecking || el.classList.contains("correct") || el.classList.contains("selected")) return;

      if (first && el.dataset.type === first.dataset.type) {
        first.classList.remove("selected");
        first = el;
        el.classList.add("selected");
        return;
      }

      el.classList.add("selected");

      if (!first) {
        first = el;
      } else if (el !== first) {
        second = el;
        checkMatch();
      }
    });
  });
}

function checkMatch() {
  if (!first || !second) return;
  isChecking = true;

  if (gameState.mode === "learn") {
    if (first.dataset.value === second.dataset.value) {
      first.classList.add("correct");
      second.classList.add("correct");
      first.classList.remove("selected");
      second.classList.remove("selected");
      playSound(correctSound);
      vibrate(50);
      first = null;
      second = null;
      isChecking = false;
      checkWin();
    } else {
      // FIX: learn mode had no wrong feedback at all — isChecking was also left true,
      // permanently freezing input after the first wrong pair.
      first.classList.add("wrong");
      second.classList.add("wrong");
      playSound(wrongSound);
      vibrate(200);
      setTimeout(() => {
        if (first) first.classList.remove("wrong", "selected");
        if (second) second.classList.remove("wrong", "selected");
        first = null;
        second = null;
        isChecking = false;
      }, 300);
    }
    return;
  }

  gameState.attempts++;
  ui.attemptsDisplay.textContent = gameState.attempts;

  if (first.dataset.value === second.dataset.value) {
    gameState.correctAttempts++;

    if (gameState.mode === "timer") {
      gameState.combo++;
      if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
      }
      gameState.score += (gameState.combo * 10);
      ui.scoreDisplay.textContent = gameState.score;
      ui.comboDisplay.textContent = gameState.combo;
      showComboPopup();
    }

    first.classList.add("correct");
    second.classList.add("correct");
    playSound(correctSound);
    vibrate(50);
    updateAccuracy();
    checkWin();
    checkAchievements();

    first = null;
    second = null;
    isChecking = false;
  } else {
    first.classList.add("wrong");
    second.classList.add("wrong");
    playSound(wrongSound);
    vibrate(200);

    if (gameState.mode === "timer") {
      gameState.score = Math.max(0, gameState.score - 5);
      gameState.combo = 0;
      ui.comboDisplay.textContent = "0";
      ui.scoreDisplay.textContent = gameState.score;
    }

    setTimeout(() => {
      // FIX: null guards in case timer fires and clears first/second during this delay
      if (first) first.classList.remove("wrong", "selected");
      if (second) second.classList.remove("wrong", "selected");
      first = null;
      second = null;
      isChecking = false;
    }, 300);
  }
}

function updateAccuracy() {
  if (gameState.attempts === 0) return;
  const percent = Math.round((gameState.correctAttempts / gameState.attempts) * 100);
  ui.accuracyDisplay.textContent = percent + "%";
}

function saveHighscore() {
  // FIX: parseInt to avoid string comparison bugs when reading from localStorage
  const best = parseInt(localStorage.getItem("highscore")) || 0;
  if (gameState.score > best) {
    localStorage.setItem("highscore", gameState.score);
    ui.highscoreDisplay.textContent = gameState.score;
  }
}

function updateStats() {
  let stats = JSON.parse(localStorage.getItem("stats")) || {
    gamesPlayed: 0,
    correctTotal: 0,
    bestCombo: 0,
    bestScore: 0
  };

  stats.gamesPlayed++;
  stats.correctTotal += gameState.correctAttempts;
  // FIX: was gameState.combo — which is reset to 0 after any wrong match,
  // so bestCombo was nearly always saved as 0.
  if (gameState.maxCombo > stats.bestCombo) stats.bestCombo = gameState.maxCombo;
  if (gameState.score > stats.bestScore) stats.bestScore = gameState.score;

  localStorage.setItem("stats", JSON.stringify(stats));
  renderStats();
}

function renderStats() {
  const stats = JSON.parse(localStorage.getItem("stats")) || {
    gamesPlayed: 0, correctTotal: 0, bestCombo: 0, bestScore: 0
  };
  ui.gamesPlayedDisplay.textContent = stats.gamesPlayed;
  ui.correctTotalDisplay.textContent = stats.correctTotal;
  ui.bestComboDisplay.textContent = stats.bestCombo;
  ui.bestScoreDisplay.textContent = stats.bestScore;
}

function checkAchievements() {
  let unlocked = JSON.parse(localStorage.getItem("achievements")) || [];
  achievements.forEach(achievement => {
    if (!unlocked.includes(achievement.id) && achievement.condition()) {
      unlocked.push(achievement.id);
      localStorage.setItem("achievements", JSON.stringify(unlocked));
      vibrate([100, 50, 100]);
      showAchievementPopup(achievement.title);
    }
  });
}

function showAchievementPopup(title) {
  const popup = document.createElement("div");
  popup.classList.add("achievement-popup");
  popup.textContent = "Achievement unlocked: " + title;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 3000);
}

function showComboPopup() {
  if (gameState.combo < 2) return;
  ui.comboPopup.textContent = `🔥 COMBO x${gameState.combo}`;
  ui.comboPopup.classList.add("show");
  setTimeout(() => ui.comboPopup.classList.remove("show"), 500);
}

function saveScore() {
  // FIX: guard against learn mode where attempts is always 0, producing NaN
  if (gameState.attempts === 0) return;
  const percent = Math.round((gameState.correctAttempts / gameState.attempts) * 100);
  const newResult = { attempts: gameState.attempts, accuracy: percent };

  let history = JSON.parse(localStorage.getItem("history")) || [];
  history.unshift(newResult);
  history = history.slice(0, 5);

  ui.lastScoreDisplay.textContent = `${gameState.attempts} pokusů, ${percent}%`;
  localStorage.setItem("history", JSON.stringify(history));
}

function showGameOver(message, scoreOrPercent) {
  clearInterval(gameState.timerInterval);
  const highscore = parseInt(localStorage.getItem("highscore")) || 0;
  // FIX: was >= which showed "new record" when score equalled the existing record
  const isNewRecord = gameState.score > highscore && gameState.score > 0;

  // FIX: was injecting <div class="gameover-content"><h2>…</h2>…</div> into #final-score,
  // which nested .gameover-content inside the existing .gameover-content in the HTML,
  // doubling the title and breaking the layout. Now we update the title element directly.
  if (ui.gameoverTitle) ui.gameoverTitle.textContent = message;

  if (gameState.mode === "timer") {
    ui.finalScore.innerHTML = `
      <p>🎯 Score: <strong>${gameState.score}</strong></p>
      <p>🔥 Max combo: <strong>${gameState.maxCombo}</strong></p>
      ${isNewRecord ? `<div class="new-record">🏆 NOVÝ REKORD!</div>` : ""}
    `;
  } else {
    ui.finalScore.innerHTML = `
      <p>🧠 Pokusy: <strong>${gameState.attempts}</strong></p>
      <p>📈 Úspěšnost: <strong>${scoreOrPercent}%</strong></p>
    `;
  }

  ui.gameScreen.classList.add("finished");
  ui.gameOverScreen.style.display = "flex";
}

function checkWin() {
  const allCorrect = document.querySelectorAll(".correct");
  const total = document.querySelectorAll("#cz-list .word").length;

  if (allCorrect.length === total * 2) {
    if (gameState.mode === "timer") {
      gameState.score += 50;
      ui.scoreDisplay.textContent = gameState.score;
      ui.czList.innerHTML = "";
      ui.enList.innerHTML = "";
      first = null;
      second = null;
      isChecking = false;

      const selectedWords = getSelectedWords();
      const shuffledEn = [...selectedWords].sort(() => Math.random() - 0.5);
      renderWords(selectedWords, shuffledEn);
      return;
    }

    // FIX: learn mode had no special handling, so it fell through to the percentage
    // calculation where attempts is always 0 → NaN was saved to localStorage everywhere.
    if (gameState.mode === "learn") {
      setTimeout(() => {
        showGameOver("📚 Všechna slova spojena!", 100);
        updateStats();
      }, 300);
      return;
    }

    setTimeout(() => {
      const percent = Math.round((gameState.correctAttempts / gameState.attempts) * 100);
      const message = percent === 100 ? "🏆 Perfektní!" : percent >= 70 ? "👍 Dobrá práce!" : "📚 Ještě trénuj!";

      showGameOver(message, percent);
      saveScore();
      renderHistory();
      updateStats();
      ui.highscoreDisplay.textContent = localStorage.getItem("highscore") || 0;
    }, 300);
  }
}

// --- Rest of Event Listeners ---

ui.playAgainBtn.addEventListener("click", () => {
  ui.gameScreen.classList.remove("finished");
  ui.gameOverScreen.style.display = "none";
  initGame();
});

if (ui.startFromSetupBtn) {
  ui.startFromSetupBtn.addEventListener("click", () => {
    ui.actionBar.style.display = "none";
    gameState.selectedCategory = setupCategory;
    gameState.selectedCount = 4;

    const catText = categoryLabels[setupCategory] || "Vše";
    ui.categoryBtn.textContent = "Kategorie: " + catText;

    ui.setupScreen.style.display = "none";
    ui.gameScreen.style.display = "block";
    updateModeUI();
    initGame();
  });
}

ui.backToMenuSetupBtn.addEventListener("click", () => {
  ui.actionBar.style.display = "none";
  ui.setupScreen.style.display = "none";
  ui.menuScreen.style.display = "flex";
});

ui.backToSetupGameoverBtn.addEventListener("click", () => exitToSetup());

// Restore saved category preference
const savedCategory = localStorage.getItem("selectedCategory");
if (savedCategory) {
  // FIX: was only setting gameState.selectedCategory, not setupCategory —
  // so the category was used but the active button highlight never restored.
  setupCategory = savedCategory;
  gameState.selectedCategory = savedCategory;
  const categoryLabel = categoryLabels[savedCategory] || "Vše";
  ui.categoryBtn.textContent = "Kategorie: " + categoryLabel;

  // Restore active button highlight on setup screen
  ui.setupCategoryBtns.forEach(btn => {
    if (btn.dataset.category === savedCategory) btn.classList.add("active");
  });
}

loadWords();
updateModeUI();
renderHistory();
renderStats();
updateSoundButton();

ui.statsBtn.addEventListener("click", () => ui.statsModal.classList.remove("hidden"));
ui.settingsBtn.addEventListener("click", () => ui.settingsModal.classList.remove("hidden"));
ui.closeStats.addEventListener("click", () => ui.statsModal.classList.add("hidden"));
ui.closeSettings.addEventListener("click", () => ui.settingsModal.classList.add("hidden"));

ui.highscoreDisplay.textContent = localStorage.getItem("highscore") || 0;

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("history")) || [];
  ui.historyList.innerHTML = "";

  history.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.attempts} pokusů, ${item.accuracy}%`;
    ui.historyList.appendChild(li);
  });

  if (history.length > 0) {
    const last = history[0];
    ui.lastScoreDisplay.textContent = `${last.attempts} pokusů (${last.accuracy}%)`;
  } else {
    ui.lastScoreDisplay.textContent = "-";
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

if (ui.themeToggle) ui.themeToggle.addEventListener("click", toggleDarkMode);
if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark-mode");

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem("soundEnabled", soundEnabled);
  updateSoundButton();
}

function updateSoundButton() {
  if (ui.soundToggle) {
    ui.soundToggle.textContent = soundEnabled ? "🔊 Zvuky: Zapnuto" : "🔇 Zvuky: Vypnuto";
  }
}

ui.pauseBtn.addEventListener("click", togglePause);
ui.soundToggle.addEventListener("click", toggleSound);

ui.setupCategoryBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    setupCategory = btn.dataset.category;
    // FIX: save selection as soon as a button is clicked, not only at game start
    localStorage.setItem("selectedCategory", setupCategory);
    ui.setupCategoryBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    ui.actionBar.style.display = "flex";
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then(() => console.log("Service Worker registrován"))
      .catch(error => console.log("SW chyba:", error));
  });
}

function startTimer() {
  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft--;
    ui.timerDisplay.textContent = gameState.timeLeft;
    ui.timerBar.style.width = (gameState.timeLeft / 60) * 100 + "%";

    if (gameState.timeLeft <= 0) {
      clearInterval(gameState.timerInterval);
      first = null;
      second = null;
      isChecking = false;
      saveHighscore();
      updateStats();
      showGameOver("⏱️ Čas vypršel!", gameState.score);
    }
  }, 1000);
}

function togglePause() {
  if (!gameState.isPaused) {
    clearInterval(gameState.timerInterval);
    gameState.isPaused = true;
    isChecking = true;
    ui.pauseBtn.textContent = "▶ Pokračovat";
  } else {
    startTimer();
    gameState.isPaused = false;
    isChecking = false;
    ui.pauseBtn.textContent = "⏸ Pauza";
  }
}

document.addEventListener("visibilitychange", () => {
  if (gameState.mode !== "timer") return;
  if (document.visibilityState === "hidden" && !gameState.isPaused) {
    togglePause();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (ui.gameScreen.style.display === "block") {
    event.preventDefault();
    event.returnValue = "";
  }
});

function exitToSetup() {
  // FIX: was setting gameState.mode = "game" unconditionally, so returning to setup
  // from a timer or learn game silently switched the mode without the user knowing.
  // FIX: was duplicating all of resetGameState()'s logic manually.
  const currentMode = gameState.mode;
  clearInterval(gameState.timerInterval);
  resetGameState();
  gameState.mode = currentMode;

  ui.gameOverScreen.style.display = "none";
  ui.gameScreen.classList.remove("finished");
  ui.gameScreen.style.display = "none";
  ui.setupScreen.style.display = "block";
}