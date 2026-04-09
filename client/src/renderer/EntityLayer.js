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
      sprite.label = "character";
      pContainer.addChild(sprite);

      // 텍스처가 투명하거나 깨졌을 경우를 대비한 강제 표시 (디버그)
      const debugGraphic = new PIXI.Graphics();
      debugGraphic.circle(0, 0, 30); // 눈에 띄게 큰 원!
      debugGraphic.fill({ color: p.isTagger ? 0x2196f3 : 0xff5252, alpha: 1.0 });
      debugGraphic.stroke({ color: 0xffffff, width: 3 });
      pContainer.addChild(debugGraphic);

      const jailBox = new PIXI.Graphics();
      jailBox.label = "jailBox";
      pContainer.addChild(jailBox);

      const nameText = new PIXI.Text({
        text: p.nickname || "User", 
        style: { fontSize: 13, fill: "white", align: "center", stroke: {color: "black", width: 3} }
      });
      nameText.y = -22;
      nameText.anchor.set(0.5, 1);
      nameText.label = "label";
      pContainer.addChild(nameText);

      entityContainer.addChild(pContainer);
      spriteCache.players[id] = pContainer;
    }

    const pContainer = spriteCache.players[id];
    pContainer.visible = isVisible;
    if (!isVisible) return; 

    pContainer.x = p.x + 10;
    pContainer.y = p.y + 10;

    // 액션 상태 그리기
    let actionIndicator = pContainer.getChildByLabel("actionIndicator");
    if (!actionIndicator) {
      actionIndicator = new PIXI.Graphics();
      actionIndicator.label = "actionIndicator";
      pContainer.addChild(actionIndicator);
    }
    
    actionIndicator.clear();
    
    if (p.action === 'FARMING' && p.actionProgress > 0) {
      // 5초 게이지바 UI (노란색)
      actionIndicator.rect(-20, -50, 40, 8);
      actionIndicator.fill({ color: 0x333333 });
      const pct = Math.min(1, p.actionProgress / 300);
      actionIndicator.rect(-20, -50, 40 * pct, 8);
      actionIndicator.fill({ color: 0xffd700 }); 
    } else if (p.action === 'SKILL') {
      // 스킬 사용 원형 오라 (아우라)
      actionIndicator.circle(0, 0, 45);
      actionIndicator.stroke({ color: p.isTagger ? 0x00ffff : 0xffa500, width: 4 });
    } else if (p.action === 'ITEM') {
      // 아이템 사용 효과 (머리 위 십자가 마크)
      actionIndicator.rect(-5, -60, 10, 25);
      actionIndicator.rect(-12, -52, 24, 10);
      actionIndicator.fill({ color: 0x00ff00 });
    } else if (p.action === 'TRAP') {
      // 함정 설치 시각 범위 표시
      actionIndicator.rect(-30, -30, 60, 60);
      actionIndicator.stroke({ color: 0xff0000, width: 3, alpha: 0.8 });
    }
    
    pContainer.alpha = p.isStealth ? 0.4 : 1.0;

    const label = pContainer.getChildByLabel("label");
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

    const jailBox = pContainer.getChildByLabel("jailBox");
    if (p.isJailed) {
      jailBox.clear();
      jailBox.rect(-12, -12, 24, 24);
      jailBox.fill({ color: 0x9c27b0, alpha: 0.6 });
    } else {
      jailBox.clear();
    }
  });

}
