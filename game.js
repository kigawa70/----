const WIDTH = 30;
const HEIGHT = 15;
let map = [];
let playerX, playerY;
let floor = 1; // 現在のフロア
let stairsX, stairsY;
let enemies = []; // 敵のリスト
let items = [];   // アイテムのリスト
let enemyBaseReduction = 0; // 敵の母数を恒久的に減らす




function generateMap() {
  map = Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => "#")
  );

  // 深さに応じて部屋数・サイズを増加
  let roomCount = 5 + Math.floor(floor / 2);
  for (let i = 0; i < roomCount; i++) {
    let rw = Math.floor(Math.random() * 6) + 4 + Math.floor(floor / 3);
    let rh = Math.floor(Math.random() * 4) + 3 + Math.floor(floor / 3);
    let rx = Math.floor(Math.random() * (WIDTH - rw - 1));
    let ry = Math.floor(Math.random() * (HEIGHT - rh - 1));
    for (let y = ry; y < ry + rh && y < HEIGHT; y++) {
      for (let x = rx; x < rx + rw && x < WIDTH; x++) {
        map[y][x] = ".";
      }
    }
  }

  placeStairs();
  placeEnemies();

  // --- アイテムは5フロアごとに1つ出現 ---
  if ((floor - 1) % 5 === 0) {
    placeItems();
  } else {
    items = [];
  }
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

// BFSで到達可能性を確認
function isReachable(sx, sy, tx, ty) {
  let visited = Array.from({ length: HEIGHT }, () =>
    Array(WIDTH).fill(false)
  );
  let queue = [[sx, sy]];
  visited[sy][sx] = true;

  while (queue.length > 0) {
    let [x, y] = queue.shift();
    if (x === tx && y === ty) return true;

    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let [dx, dy] of dirs) {
      let nx = x + dx, ny = y + dy;
      if (
        nx >= 0 && nx < WIDTH &&
        ny >= 0 && ny < HEIGHT &&
        !visited[ny][nx] &&
        map[ny][nx] !== "#"
      ) {
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

function placeEnemies() {
  enemies = [];
  let enemyCount = 2 + Math.floor((floor - 1) / 3);

  // --- 母数を恒久的に減らす ---
  enemyCount = Math.max(1, enemyCount - enemyBaseReduction);

  for (let i = 0; i < enemyCount; i++) {
    while (true) {
      let x = Math.floor(Math.random() * WIDTH);
      let y = Math.floor(Math.random() * HEIGHT);
      if (map[y][x] === "." && !(x === playerX && y === playerY)) {
        let type = "random";
        if (floor >= 9) {
          if (!enemies.some(e => e.type === "chaser")) {
            type = "chaser"; // 最低1体は追従型
          } else {
            if (Math.random() < 0.5) type = "chaser";
          }
        }
        enemies.push({ x, y, type });
        break;
      }
    }
  }
}


function placeItems() {
  items = [];
  while (true) {
    let x = Math.floor(Math.random() * WIDTH);
    let y = Math.floor(Math.random() * HEIGHT);
    if (map[y][x] === "." &&
        !(x === playerX && y === playerY) &&
        !enemies.some(e => e.x === x && e.y === y)) {
      items.push({ x, y });
      break;
    }
  }
}

function checkItemPickup() {
  let idx = items.findIndex(it => it.x === playerX && it.y === playerY);
  if (idx !== -1) {
    items.splice(idx, 1);
    if (enemies.length > 0) {
      let removeIndex = Math.floor(Math.random() * enemies.length);
      enemies.splice(removeIndex, 1);
    }
    enemyBaseReduction++; // 恒久的に母数を1減らす
    logMessage("アイテムを拾った！ 敵の総数が1体減少した！");

  }
}


function move(dx, dy) {
  let newX = playerX + dx;
  let newY = playerY + dy;
  if (newX >= 0 && newX < WIDTH && newY >= 0 && newY < HEIGHT) {
    let tile = map[newY][newX];
    if (tile === "." || tile === ">") {
      playerX = newX;
      playerY = newY;

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

function enemyTurn() {
  enemies.forEach(e => {
    let dx = 0, dy = 0;

    if (e.type === "random") {
      dx = Math.floor(Math.random() * 3) - 1;
      dy = Math.floor(Math.random() * 3) - 1;
    } else if (e.type === "chaser") {
      if (e.x < playerX) dx = 1;
      else if (e.x > playerX) dx = -1;
      if (e.y < playerY) dy = 1;
      else if (e.y > playerY) dy = -1;
    }

    let newX = e.x + dx;
    let newY = e.y + dy;

    if (
      newX >= 0 && newX < WIDTH &&
      newY >= 0 && newY < HEIGHT &&
      map[newY][newX] === "." &&
      !(newX === playerX && newY === playerY) &&
      !enemies.some(other => other !== e && other.x === newX && other.y === newY)
    ) {
      e.x = newX;
      e.y = newY;
    }

    if (e.x === playerX && e.y === playerY) {
        logMessage("ゲームオーバー！ Floor: " + floor);
        resetGame();
    }
  });
}

function render() {
  let output = `Floor: ${floor}\n`;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      let span = "";
      if (x === playerX && y === playerY) {
        span = '<span class="player">@</span>';
      } else {
        let enemyHere = enemies.find(e => e.x === x && e.y === y);
        if (enemyHere) {
          span = `<span class="${enemyHere.type === 'chaser' ? 'chaser' : 'enemy'}">` +(enemyHere.type === 'chaser' ? 'C' : 'E') + '</span>';
        } else if (items.some(it => it.x === x && it.y === y)) {
          span = '<span class="item">✦</span>';
        } else {
          span = `<span class="${map[y][x] === '#' ? 'wall' : 'floor'}">${map[y][x]}</span>`;
        }
      }
      output += span;
    }
    output += "\n";
  }
  document.getElementById("game").innerHTML = output;
}


function logMessage(msg) {
  const logDiv = document.getElementById("log");
  const p = document.createElement("p");
  p.textContent = msg;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight; // 常に最新が見えるように
}


function nextFloor() {
  floor++;
  generateMap();
  placePlayer();
  render();
}

function resetGame() {
  floor = 1;
  enemyBaseReduction = 0;
  generateMap();
  placePlayer();
  render();
}

document.addEventListener("keydown", (e) => {
  switch (e.key.toLowerCase()) {
    case "w": move(0, -1); break;
    case "s": move(0, 1); break;
    case "a": move(-1, 0); break;
    case "d": move(1, 0); break;

    case "arrowup": move(0, -1); break;
    case "arrowdown": move(0, 1); break;
    case "arrowleft": move(-1, 0); break;
    case "arrowright": move(1, 0); break;
    case "q": alert("ゲーム終了！"); break;
  }
});

generateMap();
placePlayer();
render();
