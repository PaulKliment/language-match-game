let words = [];

let gameState = {
  mode: "game",
  attempts: 0,
  correctAttempts: 0,
  selectedCategory: "all",
  selectedCount: 5,
  
  timeLeft: 60,
  score: 0,
  combo: 0,
  maxCombo: 0,
  isPaused: false,
  timerInterval: null,
};

const achievements = [
  {
    id: "perfect",
    title: "🏆 Perfekcionista",
    condition: () =>
      gameState.attempts > 0 &&
      Math.round(
        (gameState.correctAttempts /
        gameState.attempts) * 100
      ) === 100
  },

  {
    id: "combo5",
    title: "🔥 Combo Master",
    condition: () =>
      gameState.combo >= 5
  },

  {
    id: "score200",
    title: "⚡ Speed Runner",
    condition: () =>
      gameState.score >= 200
  }
];

const correctSound = new Audio("sounds/correct.mp3");
const wrongSound = new Audio("sounds/wrong.mp3");
let soundEnabled =
  localStorage.getItem("soundEnabled");

if (soundEnabled === null) {
  soundEnabled = true;
} else {
  soundEnabled =
    soundEnabled === "true";
}

function playSound(sound) {

  if (!soundEnabled) return;

  sound.currentTime = 0;

  sound.play();
   const playPromise = sound.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {});
  }
}

function vibrate(duration) {

  const isMobile =
    /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent
    );

  if (
    isMobile &&
    "vibrate" in navigator
  ) {
    navigator.vibrate(duration);
  }
}

const ui = {

loadingScreen: document.getElementById("loading-screen"),

  // ... (ponech ty, co fungují)
  menuScreen: document.getElementById("menu-screen"),
  gameScreen: document.getElementById("game-screen"),
  
  // Tlačítka menu
  startGameBtn: document.getElementById("start-game"),
  startLearnBtn: document.getElementById("start-learn"),
  startTimerBtn: document.getElementById("start-timer"),

  // Ovládání ve hře
  backMenuBtn: document.getElementById("back-menu"), // Přidáno
  
  // Časovač a skóre
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

  // Místo document.getElementById("category-btn") dej:
categoryBtn: document.getElementById("game-category-label"), 
// Místo document.getElementById("count-btn") dej:
countBtn: document.getElementById("game-count-label"),


  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  modalOptions: document.getElementById("modal-options"),

  backMenuBtn: document.getElementById("back-menu"),

  attemptsDisplay: document.getElementById("attempts"),
  accuracyDisplay: document.getElementById("accuracy"),

  restartBtn: document.getElementById("restart"),

  lastScoreDisplay: document.getElementById("last-score"),
  highscoreDisplay: document.getElementById("highscore"),

gamesPlayedDisplay: document.getElementById("games-played"),

correctTotalDisplay: document.getElementById("correct-total"),

bestComboDisplay: document.getElementById("best-combo"),

bestScoreDisplay: document.getElementById("best-score"),

  historyList: document.getElementById("history"),
  toggleHistoryBtn: document.getElementById("toggle-history"),
  historyBox: document.getElementById("history-box"),

  gameOverScreen: document.getElementById("game-over"),
  finalScore: document.getElementById("final-score"),
  playAgainBtn: document.getElementById("play-again"),

  themeToggle: document.getElementById("theme-toggle"),
  themeToggleGame: document.getElementById("theme-toggle-game"),
  soundToggle: document.getElementById("sound-toggle"),
  
  statsBtn: document.getElementById("stats-btn"),
  settingsBtn: document.getElementById("settings-btn"),

  statsModal: document.getElementById("stats-modal"),
  settingsModal: document.getElementById("settings-modal"),

  closeStats: document.getElementById("close-stats"),
  closeSettings: document.getElementById("close-settings"),


startFromSetupBtn: document.getElementById("start-from-setup"),
backToMenuSetupBtn: document.getElementById("back-to-menu-setup"),

setupScreen: document.getElementById("setup-screen"),
setupCategoryBtns: document.querySelectorAll(".setup-btn"),
setupCountBtns: document.querySelectorAll(".setup-count"),

};

let setupCategory = "all";
let setupCount = 5;

let first = null;
let second = null;
let isChecking = false;

ui.startGameBtn.addEventListener("click", () => {
  ui.menuScreen.style.display = "none";
  ui.setupScreen.style.display = "block";



  gameState.mode = "game";

});

ui.startLearnBtn.addEventListener("click", () => {
  if (words.length === 0) return;
  gameState.mode = "learn";
  
  ui.menuScreen.style.display = "none";
  ui.setupScreen.style.display = "block"; // Změněno na setup-screen
});

ui.startTimerBtn.addEventListener("click", () => {
  if (words.length === 0) return;
  gameState.mode = "timer";

  ui.menuScreen.style.display = "none";
  ui.setupScreen.style.display = "block"; // Změněno na setup-screen
});

ui.backMenuBtn.addEventListener("click", () => {

  document
    .getElementById("exit-modal")
    .classList.remove("hidden");

});

const cancelExitBtn =
  document.getElementById("cancel-exit");

if (cancelExitBtn) {

  cancelExitBtn.addEventListener(
    "click",
    () => {

      document
        .getElementById("exit-modal")
        .classList.add("hidden");

    }
  );

}

const confirmExitBtn =
  document.getElementById("confirm-exit");

if (confirmExitBtn) {

  confirmExitBtn.addEventListener(
    "click",
    () => {

      document
        .getElementById("exit-modal")
        .classList.add("hidden");

      clearInterval(gameState.timerInterval);

      ui.gameScreen.style.display = "none";
      ui.menuScreen.style.display = "flex";

    }
  );

}


function updateModeUI() {
  // Reset zobrazení
  ui.timerBox.style.display = "none";
  ui.scoreBox.style.display = "none";
  ui.pauseBtn.style.display = "none";
  document.getElementById("combo-box").style.display = "none";
  ui.timerProgress.style.display = "none";

  // Načtení boxů pokusů a úspěšnosti podle nového ID z HTML
  const attemptsBox = document.getElementById("attempts-box");
  const accuracyBox = document.getElementById("accuracy-box");

  // Defaultně zapneme zobrazení pokusů a úspěšnosti pro klasickou hru
  if (attemptsBox) attemptsBox.style.display = "block";
  if (accuracyBox) accuracyBox.style.display = "block";

  if (gameState.mode === "timer") {
    ui.timerBox.style.display = "block";
    ui.scoreBox.style.display = "block";
    ui.pauseBtn.style.display = "block";
    document.getElementById("combo-box").style.display = "block";
    ui.timerProgress.style.display = "block";

    // V ČASOVCE SCHOVÁME POKUSY A ÚSPĚŠNOST:
    if (attemptsBox) attemptsBox.style.display = "none";
    if (accuracyBox) accuracyBox.style.display = "none";

  } else if (gameState.mode === "learn") {
    // V MÓDU UČENÍ JE SCHOVÁME TAKÉ (původní logika):
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
      // Tady NESMÍ být initGame(); ani nic jiného, co hru startuje!
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

  ui.timerDisplay.textContent = gameState.timeLeft;
  ui.timerBar.style.width = "100%";
  ui.scoreDisplay.textContent = gameState.score;
  ui.comboDisplay.textContent = "0";
  ui.pauseBtn.textContent = "⏸ Pauza";
  ui.attemptsDisplay.textContent = "0";
  ui.accuracyDisplay.textContent = "0%";

  first = null;
  second = null;
  isChecking = false;
  ui.restartBtn.style.display = "none";
}

function getSelectedWords() {

  const category = gameState.selectedCategory;

  let filteredWords;

  if (category === "all") {
    filteredWords = words;
  } else {
    filteredWords = words.filter(
      word => word.category === category
    );
  }

  const shuffled = [...filteredWords]
    .sort(() => Math.random() - 0.5);

  const count = gameState.selectedCount;

  return shuffled.slice(0, count);
}

function renderWords(selectedWords, shuffledEn) {

if (ui.gameScreen.style.display !== "block") {
    return;
  }

  // CZ slova
  selectedWords.forEach(word => {

    const div = document.createElement("div");

    div.textContent = word.cz;
    div.classList.add("word");
    div.dataset.value = word.en;
    div.dataset.type = "cz";

    ui.czList.appendChild(div);
  });

  // EN slova
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

// 🔁 Inicializace hry
function initGame() {
  if (ui.gameScreen.style.display !== "block") {
    return; 
  }
  ui.gameOverScreen.style.display = "none";
  ui.czList.innerHTML = "";
  ui.enList.innerHTML = "";
resetGameState();

clearInterval(gameState.timerInterval);

first = null;
second = null;
isChecking = false;

  if (gameState.mode === "timer") {

  ui.timerBox.style.display = "block";
  ui.scoreBox.style.display = "block";

  startTimer();

} else {

  ui.timerBox.style.display = "none";
  ui.scoreBox.style.display = "none";
}
const selectedWords = getSelectedWords();

const shuffledEn = [...selectedWords]
  .sort(() => Math.random() - 0.5);
 
renderWords(selectedWords, shuffledEn);
  
}

// 🖱️ Klikání
function addListeners() {
  document.querySelectorAll(".word").forEach(el => {
    el.addEventListener("click", () => {

      if (isChecking) return;
      if (el.classList.contains("correct")) return;
      if (el.classList.contains("selected")) return;

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

// ✅ Kontrola shody
function checkMatch() {
  if (!first || !second) return;

  isChecking = true; // Zabrání klikání během animace
  
  // Logika pro režim Učení (nekonečné pokusy, žádné chyby)
  if (gameState.mode === "learn") {
    if (first.dataset.value === second.dataset.value) {
      first.classList.add("correct");
      second.classList.add("correct");
      playSound(correctSound);
      checkWin();
    }
    first.classList.remove("selected");
    second.classList.remove("selected");
    first = null;
    second = null;
    isChecking = false;
    return; // Tady return dává smysl, protože zbytek (pokusy/skóre) nás v učení nezajímá
  }

  // Logika pro Hru a Časovku
  gameState.attempts++;
  ui.attemptsDisplay.textContent = gameState.attempts;

  if (first.dataset.value === second.dataset.value) {
    // SPRÁVNĚ
    gameState.correctAttempts++;
    if (gameState.mode === "timer") {

  gameState.combo++;

  if (
  gameState.combo >
  gameState.maxCombo
) {
  gameState.maxCombo =
    gameState.combo;
}

  const comboBonus =
    gameState.combo * 10;
    

  gameState.score += comboBonus;

  ui.scoreDisplay.textContent =
    gameState.score;

  ui.comboDisplay.textContent =
    gameState.combo;
    showComboPopup();

      ui.scoreDisplay.textContent = gameState.score;
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
    // ŠPATNĚ
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
      first.classList.remove("wrong", "selected");
      second.classList.remove("wrong", "selected");
      first = null;
      second = null;
      isChecking = false;
    }, 300);
  }
}

function updateAccuracy() {
  if (gameState.attempts === 0) return;

  const percent = Math.round(
  (gameState.correctAttempts / gameState.attempts) * 100
);
  ui.accuracyDisplay.textContent = percent + "%";
}

function saveHighscore() {

  const best =
    localStorage.getItem("highscore") || 0;

  if (gameState.score > best) {

    localStorage.setItem(
      "highscore",
      gameState.score
    );

    ui.highscoreDisplay.textContent =
      gameState.score;
  }
}

function updateStats() {

  let stats = JSON.parse(
    localStorage.getItem("stats")
  ) || {

    gamesPlayed: 0,
    correctTotal: 0,
    bestCombo: 0,
    bestScore: 0
  };

  stats.gamesPlayed++;

  stats.correctTotal +=
    gameState.correctAttempts;

  if (gameState.combo > stats.bestCombo) {
    stats.bestCombo = gameState.combo;
  }

  if (gameState.score > stats.bestScore) {
    stats.bestScore = gameState.score;
  }

  localStorage.setItem(
    "stats",
    JSON.stringify(stats)
  );

  renderStats();
}

function renderStats() {

  const stats = JSON.parse(
    localStorage.getItem("stats")
  ) || {

    gamesPlayed: 0,
    correctTotal: 0,
    bestCombo: 0,
    bestScore: 0
  };

  ui.gamesPlayedDisplay.textContent =
    stats.gamesPlayed;

  ui.correctTotalDisplay.textContent =
    stats.correctTotal;

  ui.bestComboDisplay.textContent =
    stats.bestCombo;

  ui.bestScoreDisplay.textContent =
    stats.bestScore;
}

function checkAchievements() {

  let unlocked =
    JSON.parse(
      localStorage.getItem("achievements")
    ) || [];

  achievements.forEach(achievement => {

    const alreadyUnlocked =
      unlocked.includes(achievement.id);

    if (
      !alreadyUnlocked &&
      achievement.condition()
    ) {

      unlocked.push(achievement.id);

      localStorage.setItem(
        "achievements",
        JSON.stringify(unlocked)
      );
vibrate([100, 50, 100]);
      showAchievementPopup(
        achievement.title
      );
    }
  });
}

function showAchievementPopup(title) {

  const popup =
    document.createElement("div");

  popup.classList.add(
    "achievement-popup"
  );

  popup.textContent =
    "Achievement unlocked: " + title;

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 3000);
}


function showComboPopup() {

  if (gameState.combo < 2) return;

  ui.comboPopup.textContent =
    `🔥 COMBO x${gameState.combo}`;

  ui.comboPopup.classList.add("show");

  setTimeout(() => {
    ui.comboPopup.classList.remove("show");
  }, 500);
}

function saveScore() {

  const percent = Math.round(
    (gameState.correctAttempts / gameState.attempts) * 100
  );

  const newResult = {
    attempts: gameState.attempts,
    accuracy: percent,
  };

  let history = JSON.parse(
    localStorage.getItem("history")
  ) || [];

  history.unshift(newResult);

  history = history.slice(0, 5);

  ui.lastScoreDisplay.textContent =
    `${gameState.attempts} pokusů, ${percent}%`;

  localStorage.setItem(
    "history",
    JSON.stringify(history)
  );
}



  function showGameOver(message, scoreOrPercent) {

  clearInterval(gameState.timerInterval);

  const highscore =
    localStorage.getItem("highscore") || 0;

  const isNewRecord =
    gameState.score >= highscore;

  // ⏱️ TIMER MODE
  if (gameState.mode === "timer") {

    ui.finalScore.innerHTML = `

      <div class="gameover-content">

        <h2>${message}</h2>

        <p>
          🎯 Score:
          <strong>${gameState.score}</strong>
        </p>

        <p>
          🔥 Max combo:
          <strong>${gameState.maxCombo}</strong>
        </p>

        ${
          isNewRecord
          ? `
            <div class="new-record">
              🏆 NOVÝ REKORD!
            </div>
          `
          : ""
        }

      </div>
    `;

  }

  // 🎮 NORMAL GAME
  else {

    ui.finalScore.innerHTML = `

      <div class="gameover-content">

        <h2>${message}</h2>

        <p>
          🧠 Pokusy:
          <strong>${gameState.attempts}</strong>
        </p>

        <p>
          📈 Úspěšnost:
          <strong>${scoreOrPercent}%</strong>
        </p>

      </div>
    `;
  }
ui.gameScreen.classList.add("finished");
  ui.gameOverScreen.style.display = "flex";
}

// 🏆 Výhra
function checkWin() {

  const allCorrect =
    document.querySelectorAll(".correct");

  const total =
    document.querySelectorAll("#cz-list .word").length;

  if (allCorrect.length === total * 2) {

    // ⏱️ TIMER MODE
    if (gameState.mode === "timer") {

      // bonus za dokončení kola
      gameState.score += 50;

      ui.scoreDisplay.textContent =
        gameState.score;

      // vyčisti staré karty
      ui.czList.innerHTML = "";
      ui.enList.innerHTML = "";

      first = null;
      second = null;
      isChecking = false;

      // nové kolo
      const selectedWords =
        getSelectedWords();

      const shuffledEn =
        [...selectedWords].sort(
          () => Math.random() - 0.5
        );

      renderWords(
        selectedWords,
        shuffledEn
      );

      return;
    }

    // 🎮 NORMAL GAME
    setTimeout(() => {

      const percent = Math.round(
        (gameState.correctAttempts /
        gameState.attempts) * 100
      );

      let message = "";

      if (percent === 100) {
        message = "🏆 Perfektní!";
      } else if (percent >= 70) {
        message = "👍 Dobrá práce!";
      } else {
        message = "📚 Ještě trénuj!";
      }

      showGameOver(message, percent);

      saveScore();
      renderHistory();
      updateStats();

ui.highscoreDisplay.textContent =
  localStorage.getItem("highscore") || 0;

    }, 300);
  }
}

// 🔁 Restart bez reloadu
ui.restartBtn.addEventListener("click", () => {
  initGame();
});



ui.playAgainBtn.addEventListener("click", () => {
ui.gameScreen.classList.remove("finished");
  ui.gameOverScreen.style.display = "none";

  initGame();
});


if (ui.startFromSetupBtn) {
  ui.startFromSetupBtn.addEventListener("click", () => {
    // 1. Předání vybraných hodnot do herního stavu
    gameState.selectedCategory = setupCategory;
    gameState.selectedCount = setupCount;

    // 2. Aktualizace textů přímo na herní obrazovce
    let catText = "Vše";
    if (setupCategory === "animals") catText = "Zvířata";
    if (setupCategory === "things") catText = "Věci";
    
    ui.categoryBtn.textContent = "Kategorie: " + catText;
    ui.countBtn.textContent = "Počet slov: " + setupCount;

    // 3. Schování setupu a zobrazení hry
    ui.setupScreen.style.display = "none";
    ui.gameScreen.style.display = "block";

    updateModeUI();
    initGame();
  });
}

ui.backToMenuSetupBtn.addEventListener("click", () => {

  // 1. schovej setup screen
  ui.setupScreen.style.display = "none";

  // 2. vrať menu
  ui.menuScreen.style.display = "flex";

});

// Načtení uložené kategorie
const savedCategory =
  localStorage.getItem(
    "selectedCategory"
  );

if (savedCategory) {

  gameState.selectedCategory =
    savedCategory;

  let categoryLabel = "Vše";

  if (savedCategory === "animals") {
    categoryLabel = "Zvířata";
  }

  if (savedCategory === "things") {
    categoryLabel = "Věci";
  }

  ui.categoryBtn.textContent =
    "Kategorie: " + categoryLabel;
}

// Načtení počtu slov
const savedCount =
  localStorage.getItem(
    "selectedCount"
  );

if (savedCount) {

  gameState.selectedCount =
    Number(savedCount);

  ui.countBtn.textContent =
    "Počet slov: " + savedCount;
}

// 🚀 Start hry
loadWords();
updateModeUI();
renderHistory();
renderStats();
updateSoundButton();

/* 📊 Přehled */

ui.statsBtn.addEventListener("click", () => {

  ui.statsModal.classList.remove("hidden");

});

/* ⚙️ Nastavení */

ui.settingsBtn.addEventListener("click", () => {

  ui.settingsModal.classList.remove("hidden");

});

/* Zavření */

ui.closeStats.addEventListener("click", () => {

  ui.statsModal.classList.add("hidden");

});

ui.closeSettings.addEventListener("click", () => {

  ui.settingsModal.classList.add("hidden");

});

// Načtení nejlepšího skóre z paměti hned po zapnutí hry
ui.highscoreDisplay.textContent = localStorage.getItem("highscore") || 0;

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("history")) || [];

  if (history.length > 0) {
    ui.lastScoreDisplay.textContent = `${history[0].attempts} pokusů, ${history[0].accuracy}%`;
  }
  ui.historyList.innerHTML = "";

  // 1. Aktualizace seznamu historie
  history.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.attempts} pokusů, ${item.accuracy}%`;
    ui.historyList.appendChild(li);
  });

  // 2. Aktualizace "Posledního výsledku" v menu
  if (history.length > 0) {
    const last = history[0];
    ui.lastScoreDisplay.textContent = `${last.attempts} pokusů (${last.accuracy}%)`;
  } else {
    ui.lastScoreDisplay.textContent = "-";
  }
} // <--- Tady funkce KONČÍ. Žádný addEventListener už uvnitř není!

/* 🌙 Dark mode */

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");

  const isDark = document.body.classList.contains("dark-mode");

  localStorage.setItem("darkMode", isDark);
}

if (ui.themeToggle) {
  ui.themeToggle.addEventListener("click", toggleDarkMode);
}


// načtení uloženého režimu
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}

function toggleSound() {

  soundEnabled = !soundEnabled;

  localStorage.setItem(
    "soundEnabled",
    soundEnabled
  );

  updateSoundButton();
}

function updateSoundButton() {

  if (soundEnabled) {

    ui.soundToggle.textContent =
      "🔊 Zvuky: Zapnuto";

  } else {

    ui.soundToggle.textContent =
      "🔇 Zvuky: Vypnuto";
  }
}

function openModal(type) {
  ui.modal.classList.remove("hidden");
 ui.modalOptions.innerHTML = "";

  if (type === "category") {
    ui.modalTitle.textContent = "Vyber kategorii";

    const options = [
      { label: "Vše", value: "all" },
      { label: "Zvířata", value: "animals" },
      { label: "Věci", value: "things" }
    ];

    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt.label;

      btn.onclick = () => {
        gameState.selectedCategory = opt.value;

localStorage.setItem(
  "selectedCategory",
  opt.value
);

        ui.categoryBtn.textContent = "Kategorie: " + opt.label;
        ui.modal.classList.add("hidden");
        initGame();
      };

      ui.modalOptions.appendChild(btn);
    });
  }

  if (type === "count") {
    ui.modalTitle.textContent = "Počet slov";

    [3,5].forEach(num => {
      const btn = document.createElement("button");
      btn.textContent = num + " slov";

      btn.onclick = () => {
        gameState.selectedCount = num;
        localStorage.setItem(
  "selectedCount",
  num
);
        ui.countBtn.textContent = "Počet slov: " + num;
        ui.modal.classList.add("hidden");
        
      };

      ui.modalOptions.appendChild(btn);
    });
  }
}


ui.pauseBtn.addEventListener("click", togglePause);

ui.soundToggle.addEventListener(
  "click",
  toggleSound
);

ui.setupCategoryBtns.forEach(btn => {

  btn.addEventListener("click", () => {

    // uloží vybranou kategorii
    setupCategory = btn.dataset.category;

    // (volitelné) vizuální označení aktivního tlačítka
    ui.setupCategoryBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

  });

});


ui.setupCountBtns.forEach(btn => {

  btn.addEventListener("click", () => {

    // uloží počet slov (musí být číslo!)
    setupCount = Number(btn.dataset.count);

    // vizuální označení
    ui.setupCountBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

  });

});


if ("serviceWorker" in navigator) {

  window.addEventListener("load", () => {

    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => {
        console.log("Service Worker registrován");
      })
      .catch(error => {
        console.log("SW chyba:", error);
      });

  });

}
function startTimer() {

  gameState.timerInterval = setInterval(() => {

    gameState.timeLeft--;

    ui.timerDisplay.textContent =
      gameState.timeLeft;
const percent =
  (gameState.timeLeft / 60) * 100;

ui.timerBar.style.width =
  percent + "%";

    if (gameState.timeLeft <= 0) {

      clearInterval(gameState.timerInterval);
  first = null;
  second = null;
  isChecking = false;
  saveHighscore();
  updateStats();
      showGameOver(
        "⏱️ Čas vypršel!",
        gameState.score
      );
    }

  }, 1000);

}

function togglePause() {

  if (!gameState.isPaused) {

    clearInterval(gameState.timerInterval);

    gameState.isPaused = true;

    isChecking = true;

    ui.pauseBtn.textContent =
      "▶ Pokračovat";

  } else {

    startTimer();

    gameState.isPaused = false;

    isChecking = false;

    ui.pauseBtn.textContent =
      "⏸ Pauza";
  }
}

document.addEventListener(
  "visibilitychange",
  () => {

    // pouze časovka
    if (gameState.mode !== "timer") {
      return;
    }

    // pokud je stránka skrytá
    if (
      document.visibilityState === "hidden" &&
      !gameState.isPaused
    ) {

      togglePause();
    }
  }
);

window.addEventListener(
  "beforeunload",
  (event) => {

    const isGameRunning =
      ui.gameScreen.style.display === "block";

    if (isGameRunning) {

      event.preventDefault();

      event.returnValue = "";
    }
  }
);

function showScreen(id) {
  document.querySelectorAll('.screen')
    .forEach(screen => screen.classList.remove('active'));

  document.getElementById(id).classList.add('active');
}