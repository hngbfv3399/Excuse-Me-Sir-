import * as PIXI from "pixi.js";

let uiCache = {
  pings: {}
};

export function setupUILayer(uiContainer) {
  uiCache = { pings: {} };
}

export function updateUI(uiContainer, players, myId, screenW, screenH, camX, camY) {
  const me = players[myId];
  if (!me) return;

  const currentEnemyIds = new Set();

  Object.keys(players).forEach(id => {
    const p = players[id];
    const isEnemy = p.isTagger !== me.isTagger;

    if (id === myId || !isEnemy || p.isStealth) return;

    currentEnemyIds.add(id);

    // 스크린 상의 로컬 화면 좌표
    const screenX = p.x + 10 + camX;
    const screenY = p.y + 10 + camY;

    // 패딩을 주어 완전 바깥으로 나가기 직전에 판단
    const pad = 20;
    const isOffScreen = screenX < pad || screenX > screenW - pad || screenY < pad || screenY > screenH - pad;

    if (!uiCache.pings[id]) {
      const g = new PIXI.Graphics();
      uiContainer.addChild(g);
      uiCache.pings[id] = g;
    }

    const ping = uiCache.pings[id];
    ping.clear();

    if (isOffScreen) {
      let drawX = Math.max(pad, Math.min(screenW - pad, screenX));
      let drawY = Math.max(pad, Math.min(screenH - pad, screenY));

      // 상대적인 방향을 구하기 위해 (정중앙 400, 300 기준)
      const cx = screenW / 2;
      const cy = screenH / 2;
      const angle = Math.atan2(screenY - cy, screenX - cx);

      const size = 15;
      
      // 빨간색 화살표 모양 그리기
      ping.moveTo(drawX + Math.cos(angle) * size, drawY + Math.sin(angle) * size);
      ping.lineTo(drawX + Math.cos(angle + 2.5) * size, drawY + Math.sin(angle + 2.5) * size);
      ping.lineTo(drawX, drawY); // 중심점 살짝 오목하게
      ping.lineTo(drawX + Math.cos(angle - 2.5) * size, drawY + Math.sin(angle - 2.5) * size);
      ping.lineTo(drawX + Math.cos(angle) * size, drawY + Math.sin(angle) * size);
      
      ping.fill({ color: 0xff3333, alpha: 0.9 });
      ping.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
    }
  });

  Object.keys(uiCache.pings).forEach(id => {
    if (!currentEnemyIds.has(id)) {
      uiContainer.removeChild(uiCache.pings[id]);
      uiCache.pings[id].destroy();
      delete uiCache.pings[id];
    }
  });
}
