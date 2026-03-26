import { MAP, TILE, TILE_SIZE } from "../constants/map";
import tilesheetUrl from "../assets/tilesheet.png";
import { ITEM_TYPES, ITEM_SPRITES } from "../constants/items";

const tilesheet = new Image();
tilesheet.src = tilesheetUrl;

const TS = 16; // 1-Bit Pack 원본 타일 크기
const GAP = 1; // Unpacked 버전 1px 여백 적용

// 타일 매핑 (X번째, Y번째 - 0부터 시작)
const TILE_MAP = {
  FLOOR: { tx: 1, ty: 0 }, // 흙바닥
  WALL: { tx: 10, ty: 1 }, // 벽돌 성벽
  SAFE_FLOOR: { tx: 5, ty: 0 }, // 풀밭
  JAIL: { tx: 2, ty: 0 }, // 어두운 돌
  JAIL_DOOR: { tx: 9, ty: 9 }, // 철창문
};

const CHAR_MAP = {
  RUNNER: { tx: 24, ty: 0 }, // 도망자 캐릭터
  TAGGER: { tx: 26, ty: 0 }, // 술래 (푸른 관군)
  GOLD: { tx: 22, ty: 4 }, // 💰 목표물 (방장이 고른 코인)
};

export function renderGame(ctx, canvas, players, myId, items = [], activeTraps = []) {
  const me = players[myId];
  // me가 없으면 초기 접속 시 렌더링이 안될 수 있음,
  // 내 위치를 모르면 중앙(0,0)을 기본 카메라로 설정
  // 플레이어 크기(20x20)의 절반인 10px을 더해서 플레이어가 완벽한 정중앙에 오도록 보정
  const cameraX = me ? me.x + 10 - canvas.width / 2 : 0;
  const cameraY = me ? me.y + 10 - canvas.height / 2 : 0;

  // 맵 바깥쪽 우주(심연) 공간을 어두운 색으로 칠해서 맵 크기를 체감하게 함
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 🧱 맵 그리기
  MAP.forEach((row, y) => {
    row.forEach((tile, x) => {
      const worldX = x * TILE_SIZE;
      const worldY = y * TILE_SIZE;

      // 카메라 적용
      const screenX = worldX - cameraX;
      const screenY = worldY - cameraY;

      if (tilesheet.complete) {
        let t = TILE_MAP.FLOOR;
        if (tile === TILE.WALL) t = TILE_MAP.WALL;
        else if (tile === TILE.SAFE_FLOOR) t = TILE_MAP.SAFE_FLOOR;
        else if (tile === TILE.JAIL) t = TILE_MAP.JAIL;
        else if (tile === TILE.JAIL_DOOR) t = TILE_MAP.JAIL_DOOR;

        ctx.drawImage(
          tilesheet,
          t.tx * (TS + GAP),
          t.ty * (TS + GAP),
          TS,
          TS,
          screenX,
          screenY,
          TILE_SIZE,
          TILE_SIZE,
        );
      } else {
        if (tile === TILE.WALL) {
          ctx.fillStyle = "#795548"; // 갈색 담장
        } else if (tile === TILE.SAFE_FLOOR) {
          ctx.fillStyle = "#e8f5e9"; // 옅은 초록빛 (평화로운 안전지대)
        } else if (tile === TILE.JAIL) {
          ctx.fillStyle = "#f3e5f5"; // 옅은 보라색 (관아 감옥 바닥)
        } else if (tile === TILE.JAIL_DOOR) {
          ctx.fillStyle = "#607d8b"; // 철창 느낌의 청회색
        } else {
          ctx.fillStyle = "#f5f5f5"; // 일반 흙바닥
        }
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }

      // 감옥 문 🔒 아이콘 렌더링
      if (tile === TILE.JAIL_DOOR) {
        ctx.save();
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🔒", screenX + 20, screenY + 28);
        ctx.restore();
      }
    });
  });

  // 🥇 금괴 렌더링
  items.forEach((item) => {
    const screenX = item.x - cameraX;
    const screenY = item.y - cameraY;
    // 카메라 시야에 들어오는 것만 효율적으로 그리기
    if (
      screenX >= -20 &&
      screenX <= canvas.width &&
      screenY >= -20 &&
      screenY <= canvas.height
    ) {
      if (tilesheet.complete) {
        ctx.drawImage(
          tilesheet,
          CHAR_MAP.GOLD.tx * (TS + GAP),
          CHAR_MAP.GOLD.ty * (TS + GAP),
          TS,
          TS,
          screenX - 4,
          screenY - 4,
          32,
          32,
        );
      } else {
        ctx.fillStyle = "gold";
        ctx.fillRect(screenX, screenY, 20, 20);
        ctx.font = "14px Arial";
        ctx.fillText("🥇", screenX + 10, screenY + 16);
      }
    }
  });

  // 플레이어 그리기
  Object.keys(players).forEach((id) => {
    const p = players[id];

    // 상태머신: 적이 안개 부적(은신)을 사용했다면 렌더링 스킵!
    if (p.isStealth && me && p.team !== me.team) {
       return; 
    }

    const screenX = p.x - cameraX;
    const screenY = p.y - cameraY;

    ctx.save();
    
    if (p.speedBoost) {
      ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
      ctx.lineWidth = 3;
      ctx.strokeRect(screenX - 2, screenY - 2, 24, 24);
    }
    
    // 나와 아군 은신은 반투명으로 묘사
    if (p.isStealth) {
      ctx.globalAlpha = 0.4;
    }

    if (tilesheet.complete) {
      const isBig = id === myId;
      const drawSize = isBig ? 28 : 24; // 내 캐릭터는 살짝 크게 그림
      const offset = isBig ? -4 : -2;

      if (p.isTagger) {
        ctx.drawImage(
          tilesheet,
          CHAR_MAP.TAGGER.tx * (TS + GAP),
          CHAR_MAP.TAGGER.ty * (TS + GAP),
          TS,
          TS,
          screenX + offset,
          screenY + offset,
          drawSize,
          drawSize,
        );
      } else {
        ctx.drawImage(
          tilesheet,
          CHAR_MAP.RUNNER.tx * (TS + GAP),
          CHAR_MAP.RUNNER.ty * (TS + GAP),
          TS,
          TS,
          screenX + offset,
          screenY + offset,
          drawSize,
          drawSize,
        );
        // 감옥에 갇혀있으면 철창 느낌의 반투명 오버레이
        if (p.isJailed) {
          ctx.fillStyle = "rgba(100, 0, 100, 0.6)";
          ctx.fillRect(screenX, screenY, 20, 20);
        }
      }
    } else {
      // 역할에 따른 색상 변경
      if (p.isTagger) {
        ctx.fillStyle = id === myId ? "#FF5252" : "#FF1744"; // 술래: 붉은색
      } else if (p.isJailed) {
        ctx.fillStyle = "#9c27b0"; // 감옥에 갇힌 사람: 보라색
      } else {
        ctx.fillStyle = id === myId ? "#4CAF50" : "#2196F3"; // 도망자: 초록/파랑
      }

      ctx.fillRect(screenX, screenY, 20, 20);

      // 가시성을 돕기 위해 하얀 테두리를 넣습니다.
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, 20, 20);
    }

    // 닉네임 / 상태 라벨 렌더링
    ctx.fillStyle = "white";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";

    let label = p.nickname || "User";
    if (p.isTagger) {
      label = "블루팀";
    } else if (p.carriedItem) {
      label = `🥇 ${p.nickname}`;
    } else if (id === myId) {
      label = "나";
    }
    
    // 소지한 아이템 표시
    if (p.inventoryItem) {
      const typeStr = p.inventoryItem === "SPEED" ? "신속" : p.inventoryItem === "TRAP" ? "덫" : "은신";
      label = `[${typeStr}] ` + label;
      ctx.fillStyle = "#FFeb3b";
    }

    ctx.fillText(label, screenX + 10, screenY - 5);
    ctx.restore();
  });
}
