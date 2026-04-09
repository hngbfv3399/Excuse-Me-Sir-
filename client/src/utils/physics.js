import { MAP as DEFAULT_MAP, TILE, TILE_SIZE } from "../constants/map";

export function isWall(x, y, isTagger = false, customMap = null) {
  const MAP = customMap || DEFAULT_MAP;
  
  const width = 20;
  const height = 20;

  const margin = 0.001;

  const left = x + margin;
  const right = x + width - margin;
  const top = y + margin;
  const bottom = y + height - margin;

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
      return true; 
    }
    
    if (MAP[tileY]?.[tileX] === TILE.JAIL_DOOR) {
      return true;
    }
    
    if (isTagger && MAP[tileY]?.[tileX] === TILE.SAFE_FLOOR) {
      return true;
    }
  }

  return false;
}
