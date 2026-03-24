import { MAP, TILE, TILE_SIZE } from "../constants/map";

export function renderGame(ctx, canvas, players, myId) {
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

      if (tile === TILE.WALL) {
        ctx.fillStyle = "#795548"; // 갈색 담장
      } else if (tile === TILE.SAFE_FLOOR) {
        ctx.fillStyle = "#e8f5e9"; // 옅은 초록빛 (평화로운 안전지대)
      } else if (tile === TILE.JAIL) {
        ctx.fillStyle = "#f3e5f5"; // 옅은 보라색 (관아 감옥 바닥)
      } else {
        ctx.fillStyle = "#f5f5f5"; // 일반 흙바닥
      }

      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
    });
  });

  // 🧍 플레이어 그리기
  Object.keys(players).forEach((id) => {
    const p = players[id];

    const screenX = p.x - cameraX;
    const screenY = p.y - cameraY;

    // 술래 여부에 따른 색상 변경
    if (p.isTagger) {
      ctx.fillStyle = "red"; // 술래는 무조건 빨간색!
    } else {
      ctx.fillStyle = id === myId ? "cyan" : "gray"; // 나는 청록, 남들은 회색
    }

    ctx.fillRect(screenX, screenY, 20, 20);

    // 가시성을 돕기 위해 하얀 테두리를 넣습니다.
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX, screenY, 20, 20);

    // 누가지 술래인지 확실히 알기 위해 머리 위에 라벨을 그립니다.
    ctx.fillStyle = "white";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.isTagger ? "술래" : (id === myId ? "나" : ""), screenX + 10, screenY - 5);
  });
}
