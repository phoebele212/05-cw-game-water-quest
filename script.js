// Game configuration
const GOAL_CANS = 20;
const GAME_SECONDS = 30;
const SPAWN_SPEED = 850;

// Game state
let currentCans = 0;
let gameActive = false;
let spawnInterval;
let timerInterval;
let confettiTimeout;
let endTime;

// HTML elements
const grid = document.querySelector(".game-grid");
const scoreDisplay = document.getElementById("current-cans");
const timerDisplay = document.getElementById("timer");
const achievements = document.getElementById("achievements");
const startButton = document.getElementById("start-game");
const resetButton = document.getElementById("reset-game");
const confetti = document.getElementById("confetti");

// Random messages for winning and losing
const winningMessages = [
  "You did it! You completed Water Quest!",
  "Amazing collecting! You reached the goal!",
  "You won! Thanks for playing for clean water awareness!"
];

const losingMessages = [
  "Nice effort! Try again to reach 20 points.",
  "Keep practicing! Those yellow cans are waiting.",
  "Time’s up! Give Water Quest another try!"
];

// Create the 3 × 3 grid
function createGrid() {
  grid.innerHTML = "";

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("button");

    cell.type = "button";
    cell.className = "grid-cell";
    cell.disabled = true;
    cell.setAttribute("aria-label", `Empty space ${i + 1}`);

    cell.addEventListener("click", () => {
      collectItem(cell);
    });

    grid.appendChild(cell);
  }
}

// Clear all items from the grid
function clearGrid() {
  const cells = document.querySelectorAll(".grid-cell");

  cells.forEach((cell, index) => {
    cell.innerHTML = "";
    cell.dataset.item = "";
    cell.className = "grid-cell";
    cell.disabled = true;
    cell.setAttribute("aria-label", `Empty space ${index + 1}`);
  });
}

// Spawn a can and dirty water in separate cells
function spawnWaterCan() {
  if (!gameActive) return;

  if (Date.now() >= endTime) {
    endGame();
    return;
  }

  clearGrid();

  const cells = document.querySelectorAll(".grid-cell");

  const canIndex = Math.floor(Math.random() * cells.length);

  // A nonzero offset keeps dirty water in a different cell
  const offset = Math.floor(Math.random() * (cells.length - 1)) + 1;
  const dirtyIndex = (canIndex + offset) % cells.length;

  const canCell = cells[canIndex];

  // Uses the water-can image from your img folder
  canCell.innerHTML = `
    <img
      class="water-can"
      src="img/water-can-transparent.png"
      alt=""
      aria-hidden="true"
      draggable="false"
    >
  `;

  canCell.dataset.item = "can";
  canCell.classList.add("has-can");
  canCell.disabled = false;
  canCell.setAttribute("aria-label", "Collect yellow can: gain 1 point");

  const dirtyCell = cells[dirtyIndex];

  dirtyCell.innerHTML = `
    <span class="dirty-water" aria-hidden="true">💧</span>
    <span class="dirty-label" aria-hidden="true">DIRTY</span>
  `;

  dirtyCell.dataset.item = "dirty";
  dirtyCell.classList.add("has-dirty-water");
  dirtyCell.disabled = false;
  dirtyCell.setAttribute("aria-label", "Dirty water: lose 1 point");
}

// Handle clicks on game items
function collectItem(cell) {
  if (!gameActive) return;

  // Prevent scoring after time runs out
  if (Date.now() >= endTime) {
    endGame();
    return;
  }

  const item = cell.dataset.item;

  if (!item) return;

  if (item === "can") {
    currentCans += 1;

    if (currentCans === GOAL_CANS) {
      achievements.textContent =
        "20 points! Keep your score at 20 or higher until time runs out!";
    } else {
      achievements.textContent = "+1! Nice catch!";
    }
  } else {
    // Score cannot fall below zero
    currentCans = Math.max(0, currentCans - 1);
    achievements.textContent = "Dirty water! −1 point.";
  }

  scoreDisplay.textContent = currentCans;

  // Remove the item so the same can cannot be collected twice
  cell.innerHTML = "";
  cell.dataset.item = "";
  cell.className = "grid-cell";
  cell.disabled = true;
  cell.setAttribute("aria-label", "Empty space");
}

// Stop old timers before ending or resetting
function stopTimers() {
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearTimeout(confettiTimeout);
}

// Start a new 30-second game
function startGame() {
  if (gameActive) return;

  resetGame();

  gameActive = true;
  startButton.disabled = true;

  endTime = Date.now() + GAME_SECONDS * 1000;

  achievements.textContent =
    "Go! Collect yellow cans and avoid dirty water.";

  // Show the first items immediately
  spawnWaterCan();

  spawnInterval = setInterval(spawnWaterCan, SPAWN_SPEED);

  timerInterval = setInterval(() => {
    const secondsLeft = Math.max(
      0,
      Math.ceil((endTime - Date.now()) / 1000)
    );

    timerDisplay.textContent = secondsLeft;

    if (secondsLeft === 0) {
      endGame();
    }
  }, 100);
}

// End the round and choose a random result message
function endGame() {
  if (!gameActive) return;

  gameActive = false;

  stopTimers();
  clearGrid();

  timerDisplay.textContent = 0;
  startButton.disabled = false;
  startButton.textContent = "Play Again";

  const playerWon = currentCans >= GOAL_CANS;

  const messages = playerWon
    ? winningMessages
    : losingMessages;

  const randomIndex = Math.floor(Math.random() * messages.length);

  achievements.textContent =
    `${messages[randomIndex]} Final score: ${currentCans}.`;

  if (playerWon) {
    celebrateWin();
  }
}

// Reset the score, timer, board, and celebration
function resetGame() {
  stopTimers();

  gameActive = false;
  currentCans = 0;

  scoreDisplay.textContent = 0;
  timerDisplay.textContent = GAME_SECONDS;

  achievements.textContent = "Press Start Game to play!";

  startButton.disabled = false;
  startButton.textContent = "Start Game";

  confetti.replaceChildren();

  createGrid();
}

// Celebrate winning with confetti
function celebrateWin() {
  const colors = [
    "#FFC907",
    "#2E9DF7",
    "#4FCB53",
    "#FF902A"
  ];

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

// Connect buttons to their functions
startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);

// Prepare the board when the page loads
resetGame();