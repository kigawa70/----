// ====== 可変マップ＆BGM ======
const BASE_WIDTH = 30;
const BASE_HEIGHT = 15;
let WIDTH = BASE_WIDTH;
let HEIGHT = BASE_HEIGHT;

const bgm = document.getElementById("bgm");
bgm.volume = 0.3;
bgm.play();
document.addEventListener("keydown", () => {
  if (bgm.paused) bgm.play();
}, { once: true });

// ====== ゲーム状態 ======
let map = [];
let playerX, playerY;
let floor = 1;
let stairsX, stairsY;
let enemies = [];
let items = [];
let traps = [];
let enemyBaseReduction = 0;
let torchCount = 0;

// ====== 便利関数 ======
function inBounds(x, y) {
  return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;
}

function randomEmptyCell() {
  while (true) {
    const x = Math.floor(Math.random() * WIDTH);
    const y = Math.floor(Math.random() * HEIGHT);
    if (
      map[y][x] === "." &&
      !(x === playerX && y === playerY) &&
      !enemies.some(e => e.x === x && e.y === y) &&
      !items.some(it => it.x === x && it.y === y) &&
      !traps.some(t => t.x === x && t.y === y)
    ) {
      return { x, y };
    }
  }
}

// ====== 視界 ======
function getVisionRange() {
  const baseVision = Math.max(1, 3 - Math.floor(floor / 4)); 
  return baseVision + torchCount;
}


// ====== マップ生成 ======
function generateMap() {
  WIDTH = BASE_WIDTH + Math.floor(floor / 3);
  HEIGHT = BASE_HEIGHT + Math.floor(floor / 5);

  map = Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => "#")
  );

  const roomCount = 5 + Math.floor(floor / 2);
  for (let i = 0; i < roomCount; i++) {
    const rw = Math.floor(Math.random() * 6) + 4 + Math.floor(floor / 3);
    const rh = Math.floor(Math.random() * 4) + 3 + Math.floor(floor / 3);
    const rx = Math.floor(Math.random() * Math.max(1, (WIDTH - rw - 1)));
    const ry = Math.floor(Math.random() * Math.max(1, (HEIGHT - rh - 1)));
    for (let y = ry; y < ry + rh && y < HEIGHT; y++) {
      for (let x = rx; x < rx + rw && x < WIDTH; x++) {
        map[y][x] = ".";
      }
    }
  }

  placeStairs();
  placeEnemies();
  placeItems();
  placeTraps();
}

function placePlayer() {
  while (true) {
    let x = Math.floor(Math.random() * WIDTH);
    let y = Math.floor(Math.random() * HEIGHT);
    if (map[y][x] === ".") {
      playerX = x;
      playerY = y;
      if (isReachable(playerX, playerY, stairsX, stairsY)) {
        break;
      }
    }
  }
}

// ====== BFS到達確認 ======
function isReachable(sx, sy, tx, ty) {
  let visited = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
  let queue = [[sx, sy]];
  visited[sy][sx] = true;

  while (queue.length > 0) {
    let [x, y] = queue.shift();
    if (x === tx && y === ty) return true;

    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let [dx, dy] of dirs) {
      let nx = x + dx, ny = y + dy;
      if (inBounds(nx, ny) && !visited[ny][nx] && map[ny][nx] !== "#") {
        visited[ny][nx] = true;
        queue.push([nx, ny]);
      }
    }
  }
  return false;
}

function placeStairs() {
  while (true) {
    let x = Math.floor(Math.random() * WIDTH);
    let y = Math.floor(Math.random() * HEIGHT);
    if (map[y][x] === ".") {
      map[y][x] = ">";
      stairsX = x;
      stairsY = y;
      break;
    }
  }
}

// ====== 敵（ランダム移動のみ） ======
function placeEnemies() {
  enemies = [];
  let enemyCount = 2 + Math.floor((floor - 1) / 3);
  enemyCount = Math.max(1, enemyCount - enemyBaseReduction);

  for (let i = 0; i < enemyCount; i++) {
    const pos = randomEmptyCell();
    enemies.push({ x: pos.x, y: pos.y, type: "random" });
  }
}

// ====== アイテム配置 ======
function placeItems() {
  items = [];
  if ((floor - 1) % 5 === 0) {
    const pos = randomEmptyCell();
    items.push({ x: pos.x, y: pos.y, type: "orb" });
  }
  const torchChance = Math.min(0.8, 0.3 + floor * 0.02);
  if (Math.random() < torchChance) {
    const pos2 = randomEmptyCell();
    items.push({ x: pos2.x, y: pos2.y, type: "torch" });
  }
}

// ====== 罠配置 ======
function placeTraps() {
  traps = [];
  const trapCount = Math.floor(floor / 2);
  for (let i = 0; i < trapCount; i++) {
    const pos = randomEmptyCell();
    traps.push({ x: pos.x, y: pos.y });
  }
}

function checkItemPickup() {
  let idx = items.findIndex(it => it.x === playerX && it.y === playerY);
  if (idx !== -1) {
    const item = items[idx];
    items.splice(idx, 1);
    if (item.type === "torch") {
      torchCount++;
      logMessage("松明を拾った！ 視界が広がった！");
    } else if (item.type === "orb") {
      if (enemies.length > 0) {
        const removeIndex = Math.floor(Math.random() * enemies.length);
        enemies.splice(removeIndex, 1);
      }
      enemyBaseReduction++;
      logMessage("✦アイテムを拾った！ 敵の総数が1体減少した！");
    }
  }
}

// ====== 移動 ======
function move(dx, dy) {
  const newX = playerX + dx;
  const newY = playerY + dy;
  if (inBounds(newX, newY)) {
    const tile = map[newY][newX];
    if (tile === "." || tile === ">") {
      playerX = newX;
      playerY = newY;

      if (traps.some(t => t.x === playerX && t.y === playerY)) {
        logMessage("罠を踏んだ！ ゲームオーバー！");
        resetGame();
        return;
      }

      checkItemPickup();

      if (tile === ">") {
        nextFloor();
        return;
      }
    }
  }
  enemyTurn();
  render();
}

// ====== 敵ターン ======
function enemyTurn() {
  enemies.forEach(e => {
    const dx = Math.floor(Math.random() * 3) - 1;
    const dy = Math.floor(Math.random() * 3) - 1;
    const nx = e.x + dx, ny = e.y + dy;

    if (
      inBounds(nx, ny) &&
      map[ny][nx] === "." &&
      !(nx === playerX && ny === playerY) &&
      !enemies.some(other => other !== e && other.x === nx && other.y === ny)
    ) {
      e.x = nx;
      e.y = ny;
    }

    if (e.x === playerX && e.y === playerY) {
      logMessage("敵に捕まった！ ゲームオーバー！");
      resetGame();
    }
  });
}

// ====== レンダリング ======
function render() {
  const vision = getVisionRange();
  let output = `Floor: ${floor}\n`;

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const dist = Math.abs(x - playerX) + Math.abs(y - playerY);

      // プレイヤー・敵・罠・階段は視界制限
      if (dist <= vision || items.some(it => it.type === "torch" && it.x === x && it.y === y)) {
        let span = "";
        if (x === playerX && y === playerY) {
          span = '<span class="player">@</span>';
        } else if (enemies.some(e => e.x === x && e.y === y)) {
          span = '<span class="enemy">E</span>';
        } else if (items.some(it => it.x === x && it.y === y)) {
          const item = items.find(it => it.x === x && it.y === y);
          span = item.type === "torch"
            ? '<span class="torch">i</span>'
            : '<span class="item">+</span>';
        } else if (traps.some(t => t.x === x && t.y === y)) {
          span = '<span class="trap">x</span>';
        } else if (map[y][x] === "#") {
          span = `<span class="wall">#</span>`;
        } else if (map[y][x] === ">") {
          span = '<span class="stairs">></span>';
        } else {
          span = `<span class="floor">.</span>`;
        }
        output += span;
      } else {
        output += " ";
      }
    }
    output += "\n";
  }

  output += `松明: ${torchCount}\n`;
  document.getElementById("game").innerHTML = output;
}

// ====== ログ ======
function logMessage(msg) {
  const logDiv = document.getElementById("log");
  const p = document.createElement("p");
  p.textContent = msg;
  logDiv.appendChild(p);

  // --- 最大5件に制限 ---
  while (logDiv.childNodes.length > 5) {
    logDiv.removeChild(logDiv.firstChild);
  }

  logDiv.scrollTop = logDiv.scrollHeight; // 常に最新が見えるように
}


// ====== フロア遷移 ======
function nextFloor() {
  floor++;

  if (floor > 15) {
    // 30階を超えたらゴール
    logMessage("✨ 迷宮の最深部に到達した！ゲームクリア！");
    document.getElementById("game").innerHTML = "<h2>✨ GAME CLEAR ✨</h2><p>おめでとう！</p>";
    return;
  }

  generateMap();
  placePlayer();
  render();
}

function resetGame() {
  floor = 1;
  enemyBaseReduction = 0;
  torchCount = 0;
  generateMap();
  placePlayer();
  render();
}

// ====== 入力 ======
document.addEventListener("keydown", (e) => {
  switch (e.key.toLowerCase()) {
    case "w": case "arrowup":    move(0, -1); break;
    case "s": case "arrowdown":  move(0, 1);  break;
    case "a": case "arrowleft":  move(-1, 0); break;
    case "d": case "arrowright": move(1, 0);  break;
    case "q": alert("ゲーム終了！"); break;
  }
});

// ====== 起動 ======
generateMap();
placePlayer();
render();

// --- 遊び方モーダル ---
window.onload = () => {
  const modal = document.getElementById("howto-modal");
  const closeBtn = document.getElementById("close-howto");
  const howtoBtn = document.getElementById("howto-button");

  // 初回ロード時に表示
  modal.style.display = "block";

  // 「閉じる」ボタン
  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  // 「❓遊び方」ボタンで再表示
  howtoBtn.onclick = (e) => {
    e.preventDefault();
    modal.style.display = "block";
  };
};
