// Each difficulty changes the goal, time, and item speed.
const difficultyModes = {
  easy: {
    name: "Easy",
    goal: 15,
    seconds: 40,
    spawnSpeed: 1200
  },
  normal: {
    name: "Normal",
    goal: 20,
    seconds: 30,
    spawnSpeed: 850
  },
  hard: {
    name: "Hard",
    goal: 25,
    seconds: 25,
    spawnSpeed: 650
  }
};

// Milestone LevelUp: an array of messages and progress thresholds.
const milestones = [
  { progress: 0.25, message: "Great start! A quarter of the way there!" },
  { progress: 0.5, message: "Halfway there! Keep collecting!" },
  { progress: 0.75, message: "Almost there! You're making great progress!" },
  {
    progress: 1,
    message: "Goal reached! Keep your score up until time runs out!"
  }
];

// Game state
let currentCans = 0;
let gameActive = false;
let soundEnabled = false;
let spawnInterval;
let timerInterval;
let confettiTimeout;
let endTime = 0;
let reachedMilestones = new Set();

// HTML elements
const grid = document.querySelector(".game-grid");
const scoreDisplay = document.getElementById("current-cans");
const timerDisplay = document.getElementById("timer");
const goalDisplay = document.getElementById("goal");
const achievements = document.getElementById("achievements");
const startButton = document.getElementById("start-game");
const resetButton = document.getElementById("reset-game");
const difficultySelect = document.getElementById("difficulty");
const levelDescription = document.getElementById("level-description");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const soundButton = document.getElementById("sound-toggle");
const collectSound = document.getElementById("collect-sound");
const confetti = document.getElementById("confetti");

const winningMessages = [
  "You did it! You completed Water Quest!",
  "Amazing collecting! You reached the goal!",
  "You won! Keep the clean water conversation going!"
];

const losingMessages = [
  "Nice effort! Try again or choose an easier difficulty.",
  "Keep practicing! Those yellow cans are waiting.",
  "Time's up! Give Water Quest another try!"
];

function getMode() {
  return difficultyModes[difficultySelect.value];
}

function randomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

// Create nine buttons once to keep the board stable.
function createGrid() {
  grid.replaceChildren();

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("button");

    cell.type = "button";
    cell.className = "grid-cell";
    clearCell(cell, i);

    cell.addEventListener("click", () => collectItem(cell));

    grid.appendChild(cell);
  }
}

// Remove an item's DOM elements after collection or expiration.
function clearCell(cell, index) {
  cell.replaceChildren();
  cell.dataset.item = "";
  cell.className = "grid-cell";
  cell.disabled = true;

  const label = index === undefined
    ? "Empty space"
    : `Empty space ${index + 1}`;

  cell.setAttribute("aria-label", label);
}

function clearGrid() {
  Array.from(grid.children).forEach((cell, index) => {
    clearCell(cell, index);
  });
}

function updateProgress() {
  const mode = getMode();

  scoreDisplay.textContent = currentCans;
  goalDisplay.textContent = mode.goal;
  progressText.textContent = `${currentCans} / ${mode.goal}`;

  progressBar.max = mode.goal;
  progressBar.value = Math.min(currentCans, mode.goal);
  progressBar.textContent = `${currentCans} / ${mode.goal}`;
}

function playCollectSound() {
  if (!soundEnabled) return;

  collectSound.currentTime = 0;

  // Missing files or blocked audio should never interrupt gameplay.
  collectSound.play().catch(() => {});
}

// Show one yellow can and one dirty-water item.
function spawnWaterCan() {
  if (!gameActive) return;

  if (Date.now() >= endTime) {
    endGame();
    return;
  }

  clearGrid();

  const cells = Array.from(grid.children);
  const canIndex = Math.floor(Math.random() * cells.length);
  const offset = Math.floor(Math.random() * (cells.length - 1)) + 1;
  const dirtyIndex = (canIndex + offset) % cells.length;

  const canCell = cells[canIndex];

  const canImage = document.createElement("img");
  canImage.className = "water-can";
  canImage.src = "img/water-can-transparent.png";
  canImage.alt = "";
  canImage.draggable = false;
  canImage.setAttribute("aria-hidden", "true");

  canCell.appendChild(canImage);
  canCell.dataset.item = "can";
  canCell.classList.add("has-can");
  canCell.disabled = false;
  canCell.setAttribute("aria-label", "Collect yellow can: gain 1 point");

  const dirtyCell = cells[dirtyIndex];

  const drop = document.createElement("span");
  drop.className = "dirty-water";
  drop.textContent = "💧";
  drop.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "dirty-label";
  label.textContent = "DIRTY";
  label.setAttribute("aria-hidden", "true");

  dirtyCell.append(drop, label);
  dirtyCell.dataset.item = "dirty";
  dirtyCell.classList.add("has-dirty-water");
  dirtyCell.disabled = false;
  dirtyCell.setAttribute("aria-label", "Dirty water: lose 1 point");
}

function collectItem(cell) {
  if (!gameActive) return;

  if (Date.now() >= endTime) {
    endGame();
    return;
  }

  const item = cell.dataset.item;
  if (!item) return;

  // Remove the item immediately to prevent repeat collection.
  clearCell(cell);

  achievements.className = "achievement";

  if (item === "can") {
    currentCans += 1;
    playCollectSound();

    const mode = getMode();
    let message = "+1! Nice catch!";

    milestones.forEach((milestone, index) => {
      const threshold = Math.ceil(mode.goal * milestone.progress);

      if (
        currentCans >= threshold &&
        !reachedMilestones.has(index)
      ) {
        reachedMilestones.add(index);
        message = milestone.message;
      }
    });

    achievements.textContent = message;
  } else {
    currentCans = Math.max(0, currentCans - 1);
    achievements.textContent = "Dirty water! −1 point. Watch for yellow cans.";
    achievements.classList.add("warning");
  }

  updateProgress();
}

function stopTimers() {
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearTimeout(confettiTimeout);
}

function startGame() {
  if (gameActive) return;

  resetGame();

  const mode = getMode();

  gameActive = true;
  startButton.disabled = true;
  difficultySelect.disabled = true;

  endTime = Date.now() + mode.seconds * 1000;

  achievements.textContent = "Go! Collect yellow cans and avoid dirty water.";

  spawnWaterCan();
  spawnInterval = setInterval(spawnWaterCan, mode.spawnSpeed);

  timerInterval = setInterval(() => {
    const secondsLeft = Math.max(
      0,
      Math.ceil((endTime - Date.now()) / 1000)
    );

    timerDisplay.textContent = secondsLeft;
    timerDisplay.classList.toggle("time-warning", secondsLeft <= 5);

    if (secondsLeft === 0) {
      endGame();
    }
  }, 100);
}

function endGame() {
  if (!gameActive) return;

  const mode = getMode();
  const playerWon = currentCans >= mode.goal;

  gameActive = false;
  stopTimers();
  clearGrid();

  timerDisplay.textContent = 0;
  timerDisplay.classList.remove("time-warning");

  startButton.disabled = false;
  startButton.textContent = "Play Again";
  difficultySelect.disabled = false;

  achievements.className = playerWon
    ? "achievement success"
    : "achievement warning";

  const message = randomMessage(
    playerWon ? winningMessages : losingMessages
  );

  achievements.textContent =
    `${message} Final score: ${currentCans}/${mode.goal} (${mode.name}).`;

  if (playerWon) {
    celebrateWin();
  }
}

function resetGame() {
  stopTimers();

  const mode = getMode();

  gameActive = false;
  currentCans = 0;
  reachedMilestones = new Set();

  timerDisplay.textContent = mode.seconds;
  timerDisplay.classList.remove("time-warning");

  levelDescription.textContent =
    `${mode.name}: finish with at least ${mode.goal} points ` +
    `after ${mode.seconds} seconds.`;

  achievements.className = "achievement";
  achievements.textContent = "Press Start Game to play!";

  startButton.disabled = false;
  startButton.textContent = "Start Game";
  difficultySelect.disabled = false;

  collectSound.pause();
  collectSound.currentTime = 0;

  confetti.replaceChildren();
  clearGrid();
  updateProgress();
}

function celebrateWin() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const colors = ["#FFC907", "#2E9DF7", "#4FCB53", "#FF902A"];

  for (let i = 0; i < 50; i++) {
    const piece = document.createElement("span");

    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.4}s`;

    confetti.appendChild(piece);
  }

  confettiTimeout = setTimeout(() => {
    confetti.replaceChildren();
  }, 2600);
}

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  soundButton.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
  soundButton.setAttribute("aria-pressed", String(soundEnabled));

  if (soundEnabled) {
    playCollectSound();
  } else {
    collectSound.pause();
  }
});

startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);
difficultySelect.addEventListener("change", resetGame);

createGrid();
resetGame();