import * as PIXI from "pixi.js";
import { setupMapLayer } from "./MapLayer";
import { setupEntityLayer, updateEntities } from "./EntityLayer";
import tilesheetUrl from "../assets/tilesheet.png";

export class PixiEngine {
  constructor(canvasElement) {
    this.app = new PIXI.Application();
    this.canvas = canvasElement;
    this.layers = {};
    this.isInitialized = false;
  }

  async init() {
    try {
      console.log("1. Starting Pixi app.init");
      await this.app.init({
        canvas: this.canvas,
        width: 800,
        height: 600,
        backgroundColor: 0x1e1e1e,
      });
      console.log("2. App init success, loading texture from:", tilesheetUrl);

      // 타일시트 로드
      this.texture = await PIXI.Assets.load(tilesheetUrl);
      console.log("3. Texture load success", this.texture);
      
      // 전체를 감싸는 카메라 컨테이너
      this.cameraContainer = new PIXI.Container();
      this.app.stage.addChild(this.cameraContainer);

      // 맵 계층 (바닥, 벽)
      this.layers.map = new PIXI.Container();
      this.cameraContainer.addChild(this.layers.map);

      // 엔티티 계층 (아이템, 플레이어)
      this.layers.entity = new PIXI.Container();
      this.cameraContainer.addChild(this.layers.entity);

      // 계층 초기 설정
      setupMapLayer(this.layers.map, this.texture);
      setupEntityLayer(this.layers.entity, this.texture);
      console.log("PixiJS Init completed. Map & Entity containers added.");
      this.isInitialized = true;
    } catch (e) {
      console.error("PixiJS Init Error:", e);
      alert("PixiJS 초기화 에러: " + e.message);
    }
  }

  update(players, myId, items, traps) {
    if (!this.isInitialized) return;
    
    try {
      const me = players[myId];
      if (me) {
        // 카메라 위치 화면 중앙 보정 (플레이어 20x20 크기의 중심점 10을 뺌)
        this.cameraContainer.x = this.app.screen.width / 2 - me.x - 10;
        this.cameraContainer.y = this.app.screen.height / 2 - me.y - 10;
      }

      // 엔티티 상태 (위치, 은신, 아이템 획득 등) 업데이트
      updateEntities(this.layers.entity, players, myId, items, traps, this.texture);
    } catch (e) {
      console.error("PixiJS Update Error:", e);
    }
  }

  destroy() {
    if (this.app) {
      this.app.destroy(false, { children: true });
    }
  }
}
