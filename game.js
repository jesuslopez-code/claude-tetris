'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#ff5252', // bomba - rojo
  '#ffe082', // single - dorado
  '#b0bec5', // hueca - gris
];

// Tipos especiales: no salen en el sorteo normal de tetrominós.
const BOMB = 8;
const SINGLE = 9;
const HOLLOW = 10;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8]],                                      // bomba
  [[9]],                                      // single
  [[10,10,10],[10,0,10],[10,10,10]],          // hueca
];

const BOMB_RADIUS = 1;      // 1 = área 3x3
const BOMB_BLOCK_SCORE = 50;
const HOLLOW_CHANCE = 0.08; // solo en modo desafío
const FLASH_MS = 150;

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let hold, holdUsed, combo, pendingReward, flashCells, flashUntil;
let mode = 'classic';

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomPiece() {
  if (mode === 'challenge' && Math.random() < HOLLOW_CHANCE) return makePiece(HOLLOW);
  return makePiece(Math.floor(Math.random() * 7) + 1);
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  if (current.type === BOMB || current.type === SINGLE) return;
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    combo++;
    if (cleared === 4) pendingReward = SINGLE; // Tetris: premio de pieza 1x1
    score += (LINE_SCORES[cleared] || 0) * level * combo;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

// La bomba no se fusiona con el tablero: destruye el área a su alrededor
// y desaparece. No aplica gravedad: dejar huecos es parte de la mecánica.
function explode(cx, cy) {
  let destroyed = 0;
  flashCells = [];
  for (let r = cy - BOMB_RADIUS; r <= cy + BOMB_RADIUS; r++) {
    for (let c = cx - BOMB_RADIUS; c <= cx + BOMB_RADIUS; c++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (board[r][c]) {
        board[r][c] = 0;
        destroyed++;
      }
      flashCells.push({ x: c, y: r });
    }
  }
  flashUntil = performance.now() + FLASH_MS;
  score += destroyed * BOMB_BLOCK_SCORE;
}

function lockPiece() {
  if (gameOver) return;
  if (current.type === BOMB) {
    // Turno neutro: no rompe la racha de combo ni la alimenta.
    explode(current.x, current.y);
  } else {
    merge();
    if (clearLines() === 0) combo = 0;
  }
  holdUsed = false;
  spawn();
  updateHUD();
}

function holdPiece() {
  if (gameOver || paused || holdUsed) return;
  const stored = hold;
  hold = makePiece(current.type);
  if (stored === null) {
    spawn();
  } else {
    current = makePiece(stored.type);
    if (collide(current.shape, current.x, current.y)) endGame();
  }
  holdUsed = true;
  drawHold();
}

function spawn() {
  current = next;
  // La recompensa se ve primero en el panel NEXT y llega al turno siguiente.
  next = pendingReward ? makePiece(pendingReward) : randomPiece();
  pendingReward = null;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo >= 2 ? `x${combo}` : '—';
  comboEl.classList.toggle('combo-active', combo >= 2);
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  if (colorIndex === BOMB) {
    context.fillStyle = 'rgba(0,0,0,0.55)';
    context.beginPath();
    context.arc(x * size + size / 2, y * size + size / 2, size * 0.28, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

// Destello de la explosión, gestionado dentro del bucle de animación
// (sin setTimeout): pausa y game over lo congelan igual que al resto.
function drawFlash() {
  if (!flashCells.length) return;
  const remaining = flashUntil - performance.now();
  if (remaining <= 0) {
    flashCells = [];
    return;
  }
  ctx.globalAlpha = (remaining / FLASH_MS) * 0.8;
  ctx.fillStyle = '#ffffff';
  for (const cell of flashCells)
    ctx.fillRect(cell.x * BLOCK + 1, cell.y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
  ctx.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-line').trim() || '#22222e';
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  drawFlash();

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawPreview(context, canvasEl, piece) {
  const NB = 30;
  context.clearRect(0, 0, canvasEl.width, canvasEl.height);
  if (!piece) return;
  const shape = PIECES[piece.type];
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, offX + c, offY + r, shape[r][c], NB);
}

function drawNext() {
  drawPreview(nextCtx, nextCanvas, next);
}

function drawHold() {
  drawPreview(holdCtx, holdCanvas, hold);
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  if (animId !== null && animId !== undefined) cancelAnimationFrame(animId);
  animId = null;
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    if (animId === null || animId === undefined) animId = requestAnimationFrame(loop);
  } else {
    if (animId !== null && animId !== undefined) cancelAnimationFrame(animId);
    animId = null;
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) { animId = null; return; }
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  // lockPiece() may have triggered game over: stop rescheduling
  if (gameOver) { animId = null; return; }
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  hold = null;
  holdUsed = false;
  pendingReward = null;
  flashCells = [];
  flashUntil = 0;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  drawHold();
  updateHUD();
  overlay.classList.add('hidden');
  if (animId !== null && animId !== undefined) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdPiece();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

const THEME_STORAGE_KEY = 'tetris-theme';

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'light' ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-pressed', theme === 'light');
  themeToggle.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

themeToggle.addEventListener('click', () => {
  const isLight = document.body.getAttribute('data-theme') === 'light';
  const nextTheme = isLight ? 'dark' : 'light';
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
  if (board) draw();
  if (next) drawNext();
  drawHold();
});

initTheme();
init();
