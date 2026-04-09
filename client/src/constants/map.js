export const TILE_SIZE = 40;

export const TILE = {
  FLOOR: 0,
  WALL: 1,
  SAFE_FLOOR: 2, 
  JAIL: 3, 
  JAIL_DOOR: 4, 
};

export const MAP = Array.from({ length: 40 }, () => Array(40).fill(TILE.FLOOR));


for (let i = 0; i < 40; i++) {
  MAP[0][i] = TILE.WALL;
  MAP[39][i] = TILE.WALL;
  MAP[i][0] = TILE.WALL;
  MAP[i][39] = TILE.WALL;
}

for (let y = 3; y < 37; y++) {
  for (let x = 3; x < 37; x++) {
    
    if ((x * 7 + y * 13) % 29 === 0 || (x * 11 + y * 5) % 23 === 0) {
      if (MAP[y - 1][x] !== TILE.WALL && MAP[y][x - 1] !== TILE.WALL) {
        MAP[y][x] = TILE.WALL;
      }
    }
  }
}

for (let y = 3; y <= 9; y++) {
  for (let x = 3; x <= 9; x++) {
    if (x === 3 || x === 9 || y === 3 || y === 9) {
      if (x === 9 && (y === 6 || y === 7)) {
         MAP[y][x] = TILE.SAFE_FLOOR; // 문 개방
      } else {
        MAP[y][x] = TILE.WALL;
      }
    } else {
      MAP[y][x] = TILE.SAFE_FLOOR;
    }
  }
}

// 스폰킬 방지용 안전 구역 확장 (SAFE_FLOOR)
for(let y = 5; y <= 8; y++) {
    for(let x = 10; x <= 12; x++) {
        MAP[y][x] = TILE.SAFE_FLOOR;
    }
}

MAP[5][12] = TILE.FLOOR; 
MAP[6][12] = TILE.FLOOR;
MAP[7][12] = TILE.FLOOR;

for (let y = 18; y <= 22; y++) {
  for (let x = 18; x <= 22; x++) {
    if (x === 18 || x === 22 || y === 18 || y === 22) {
      MAP[y][x] = TILE.WALL; 
    } else {
      MAP[y][x] = TILE.JAIL; 
    }
  }
}
MAP[22][20] = TILE.JAIL_DOOR;
MAP[20][20] = TILE.JAIL;
