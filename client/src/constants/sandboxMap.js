import { TILE } from "./map";

// 샌드박스 전용 40x40 테스트 맵
// 대부분이 평지이며, 각종 스킬/충돌 테스트를 위한 소규모 벽돌(기둥)들만 배치합니다.

export const SANDBOX_MAP = Array.from({ length: 40 }, () => Array(40).fill(TILE.FLOOR));

// 테두리 벽
for (let i = 0; i < 40; i++) {
  SANDBOX_MAP[0][i] = TILE.WALL;
  SANDBOX_MAP[39][i] = TILE.WALL;
  SANDBOX_MAP[i][0] = TILE.WALL;
  SANDBOX_MAP[i][39] = TILE.WALL;
}

// 충돌 및 시야 가림 테스트용 십자 벽 (스폰 지점 바로 옆)
for (let i = 5; i <= 9; i++) {
  SANDBOX_MAP[8][i] = TILE.WALL;
  SANDBOX_MAP[i][8] = TILE.WALL;
}

// 구석에 공격/방어팀 스폰킬 강제성 테스트를 위한 SAFE_FLOOR 미니 구역
for (let y = 3; y <= 7; y++) {
  for (let x = 3; x <= 7; x++) {
    SANDBOX_MAP[y][x] = TILE.SAFE_FLOOR;
  }
}
