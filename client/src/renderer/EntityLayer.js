import * as PIXI from "pixi.js";

const TS = 16;
const GAP = 1;

const CHAR_MAP = {
  RUNNER: { tx: 24, ty: 0 },
  TAGGER: { tx: 26, ty: 0 },
  GOLD: { tx: 22, ty: 4 },
};

let spriteCache = {
  players: {},
  items: {},
  traps: [],
};

export function setupEntityLayer(entityContainer, baseTexture) {
  spriteCache = { players: {}, items: {}, traps: [] };
}

export function updateEntities(entityContainer, players, myId, items, traps, baseTexture) {
  const getTex = (tx, ty) => new PIXI.Texture({
    source: baseTexture.source,
    frame: new PIXI.Rectangle(tx * (TS + GAP), ty * (TS + GAP), TS, TS)
  });

  
  const currentItemIds = new Set(items.map(i => i.id));
  Object.keys(spriteCache.items).forEach(id => {
    if (!currentItemIds.has(id)) {
      entityContainer.removeChild(spriteCache.items[id]);
      spriteCache.items[id].destroy();
      delete spriteCache.items[id];
    }
  });

  items.forEach(item => {
    if (!spriteCache.items[item.id]) {
      const gSprite = new PIXI.Sprite(getTex(CHAR_MAP.GOLD.tx, CHAR_MAP.GOLD.ty));
      gSprite.width = 30;
      gSprite.height = 30;
      gSprite.anchor.set(0.5);
      entityContainer.addChild(gSprite);
      spriteCache.items[item.id] = gSprite;
    }
    const sprite = spriteCache.items[item.id];
    sprite.x = item.x + 10; 
    sprite.y = item.y + 10;
  });

  
  const currentPlayerIds = new Set(Object.keys(players));
  Object.keys(spriteCache.players).forEach(id => {
    if (!currentPlayerIds.has(id)) {
      entityContainer.removeChild(spriteCache.players[id]);
      spriteCache.players[id].destroy({ children: true });
      delete spriteCache.players[id];
    }
  });

  const me = players[myId];

  Object.keys(players).forEach(id => {
    const p = players[id];
    
    
    let isVisible = true;
    if (p.isStealth && me && p.team !== me.team) {
      isVisible = false;
    }

    if (!spriteCache.players[id]) {
      const pContainer = new PIXI.Container();
      
      const isBig = id === myId;
      const tMap = p.isTagger ? CHAR_MAP.TAGGER : CHAR_MAP.RUNNER;
      const sprite = new PIXI.Sprite(getTex(tMap.tx, tMap.ty));
      sprite.width = isBig ? 28 : 24;
      sprite.height = isBig ? 28 : 24;
      sprite.anchor.set(0.5);
      sprite.name = "character";
      pContainer.addChild(sprite);

      
      const jailBox = new PIXI.Graphics();
      jailBox.name = "jailBox";
      pContainer.addChild(jailBox);

      const nameText = new PIXI.Text({
        text: p.nickname || "User", 
        style: { fontSize: 13, fill: "white", align: "center", stroke: {color: "black", width: 3} }
      });
      nameText.y = -22;
      nameText.anchor.set(0.5, 1);
      nameText.name = "label";
      pContainer.addChild(nameText);

      entityContainer.addChild(pContainer);
      spriteCache.players[id] = pContainer;
    }

    const pContainer = spriteCache.players[id];
    pContainer.visible = isVisible;
    if (!isVisible) return; 

    
    pContainer.x = p.x + 10;
    pContainer.y = p.y + 10;
    
    pContainer.alpha = p.isStealth ? 0.4 : 1.0;

    const label = pContainer.getChildByName("label");
    let labelText = p.nickname || "User";
    if (p.isTagger) labelText = "블루팀";
    else if (p.carriedItem) labelText = `🥇 ${p.nickname}`;
    else if (id === myId) labelText = "나";

    if (p.inventoryItem) {
      const typeStr = p.inventoryItem === "SPEED" ? "신속" : p.inventoryItem === "TRAP" ? "덫" : "은신";
      labelText = `[${typeStr}] ` + labelText;
      label.style.fill = "#FFeb3b";
    } else {
      label.style.fill = "white";
    }
    label.text = labelText;

    const jailBox = pContainer.getChildByName("jailBox");
    if (p.isJailed) {
      jailBox.clear();
      jailBox.rect(-12, -12, 24, 24);
      jailBox.fill({ color: 0x9c27b0, alpha: 0.6 });
    } else {
      jailBox.clear();
    }
  });

}
