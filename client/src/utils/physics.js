import { MAP, TILE, TILE_SIZE } from "../constants/map";

export function isWall(x, y, isTagger = false) {
  // 플레이어의 크기 (20x20)
  const width = 20;
  const height = 20;

  // 벽에 아주 미세하게 남는 여백(0.1)도 없애기 위해 부동소수점 수준의 플로트(float) 마진을 적용합니다.
  const margin = 0.001;

  const left = x + margin;
  const right = x + width - margin;
  const top = y + margin;
  const bottom = y + height - margin;

  // 사각형의 4개 모서리 좌표 검사
  const points = [
    { px: left, py: top },
    { px: right, py: top },
    { px: left, py: bottom },
    { px: right, py: bottom }
  ];

  for (let pt of points) {
    const tileX = Math.floor(pt.px / TILE_SIZE);
    const tileY = Math.floor(pt.py / TILE_SIZE);

    if (MAP[tileY]?.[tileX] === TILE.WALL) {
      return true; // 모서리 중 하나라도 벽에 닿으면 충돌
    }
    // 감옥 문(JAIL_DOOR)은 모두에게 벽으로 작용하여 통과 불가!
    if (MAP[tileY]?.[tileX] === TILE.JAIL_DOOR) {
      return true;
    }
    // 추가: 술래일 경우 안전 구역 방바닥(SAFE_FLOOR) 진입을 벽처럼 막음!
    if (isTagger && MAP[tileY]?.[tileX] === TILE.SAFE_FLOOR) {
      return true;
    }
  }

  return false;
}
