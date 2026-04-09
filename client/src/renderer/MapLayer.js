import * as PIXI from "pixi.js";
import { MAP, TILE, TILE_SIZE } from "../constants/map";

const TS = 16;
const GAP = 1;

const TILE_MAP = {
  FLOOR: { tx: 1, ty: 0 },
  WALL: { tx: 10, ty: 1 },
  SAFE_FLOOR: { tx: 5, ty: 0 },
  JAIL: { tx: 2, ty: 0 },
  JAIL_DOOR: { tx: 9, ty: 9 },
};

export function setupMapLayer(mapContainer, baseTexture, customMap = null) {
  const mapData = customMap || MAP;
  
  const getTexture = (tx, ty) => {
    return new PIXI.Texture({
      source: baseTexture.source,
      frame: new PIXI.Rectangle(tx * (TS + GAP), ty * (TS + GAP), TS, TS)
    });
  };

  const textures = {
    FLOOR: getTexture(TILE_MAP.FLOOR.tx, TILE_MAP.FLOOR.ty),
    WALL: getTexture(TILE_MAP.WALL.tx, TILE_MAP.WALL.ty),
    SAFE_FLOOR: getTexture(TILE_MAP.SAFE_FLOOR.tx, TILE_MAP.SAFE_FLOOR.ty),
    JAIL: getTexture(TILE_MAP.JAIL.tx, TILE_MAP.JAIL.ty),
    JAIL_DOOR: getTexture(TILE_MAP.JAIL_DOOR.tx, TILE_MAP.JAIL_DOOR.ty),
  };

  mapData.forEach((row, y) => {
    row.forEach((tile, x) => {
      let tex = textures.FLOOR;
      let isDoor = false;

      if (tile === TILE.WALL) tex = textures.WALL;
      else if (tile === TILE.SAFE_FLOOR) tex = textures.SAFE_FLOOR;
      else if (tile === TILE.JAIL) tex = textures.JAIL;
      else if (tile === TILE.JAIL_DOOR) {
        tex = textures.JAIL_DOOR;
        isDoor = true;
      }

      const sprite = new PIXI.Sprite(tex);
      sprite.width = TILE_SIZE;
      sprite.height = TILE_SIZE;
      sprite.x = x * TILE_SIZE;
      sprite.y = y * TILE_SIZE;
      
      mapContainer.addChild(sprite);

      if (isDoor) {
        const text = new PIXI.Text({
          text: "🔒", 
          style: { fontSize: 20, fill: "white" }
        });
        text.x = sprite.x + 10;
        text.y = sprite.y + 10;
        text.anchor.set(0.5);
        mapContainer.addChild(text);
      }
    });
  });
}
