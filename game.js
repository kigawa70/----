const WIDTH = 30;
const HEIGHT = 15;
let map = [];
let playerX, playerY;
let floor = 1; // 現在のフロア
let stairsX, stairsY;
let enemies = []; // 敵のリスト


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
}

function placePlayer() {
  while (true) {
    let x = Math.floor(Math.random() * WIDTH);
    let y = Math.floor(Math.random() * HEIGHT);
    if (map[y][x] === ".") {
      // 一時的にプレイヤー位置をセット
      playerX = x;
      playerY = y;

      // ちゃんと階段まで行けるか確認
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

  for (let i = 0; i < enemyCount; i++) {
    while (true) {
      let x = Math.floor(Math.random() * WIDTH);
      let y = Math.floor(Math.random() * HEIGHT);
      if (map[y][x] === "." && !(x === playerX && y === playerY)) {
        // --- 9F以降は追従型を追加 ---
        let type = "random";
        if (floor >= 9) {
          // まずは1体を必ず追従型に
          if (!enemies.some(e => e.type === "chaser")) {
            type = "chaser";
          } else {
            // 追加の敵が発生する場合、優先的に追従型を増やす
            if (Math.random() < 0.5) type = "chaser";
          }
        }
        enemies.push({ x, y, type });
        break;
      }
    }
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
      // ランダム移動
      dx = Math.floor(Math.random() * 3) - 1;
      dy = Math.floor(Math.random() * 3) - 1;
    } else if (e.type === "chaser") {
      // プレイヤー追跡
      if (e.x < playerX) dx = 1;
      else if (e.x > playerX) dx = -1;
      if (e.y < playerY) dy = 1;
      else if (e.y > playerY) dy = -1;
    }

    let newX = e.x + dx;
    let newY = e.y + dy;

    // 移動可能なら進む
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

    // プレイヤーに到達したらゲームオーバー
    if (e.x === playerX && e.y === playerY) {
      alert("ゲームオーバー！ Floor: " + floor);
      resetGame();
    }
  });
}

function render() {
  let output = `Floor: ${floor}\n`;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (x === playerX && y === playerY) {
        output += "@";
      } else {
        let enemyHere = enemies.find(e => e.x === x && e.y === y);
        if (enemyHere) {
          output += enemyHere.type === "chaser" ? "C" : "E"; // 追従型はC表示
        } else {
          output += map[y][x];
        }
      }
    }
    output += "\n";
  }
  document.getElementById("game").textContent = output;
}

function nextFloor() {
  floor++;
  generateMap();
  placePlayer();
  render();
}

function resetGame() {
  floor = 1;
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
    case "q": alert("ゲーム終了！"); break;
  }
});

generateMap();
placePlayer();
render();
