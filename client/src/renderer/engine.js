import * as PIXI from "pixi.js";
import { setupMapLayer } from "./MapLayer";
import { setupEntityLayer, updateEntities } from "./EntityLayer";
import { setupUILayer, updateUI } from "./UILayer";
import tilesheetUrl from "../assets/tilesheet.png";

export class PixiEngine {
  constructor(canvasElement) {
    this.app = new PIXI.Application();
    this.canvas = canvasElement;
    this.layers = {};
    this.isInitialized = false;
  }

  async init(customMap = null) {
    try {
      console.log("1. Starting Pixi app.init");
      await this.app.init({
        canvas: this.canvas,
        width: 800,
        height: 600,
        backgroundColor: 0x1e1e1e,
      });
      console.log("2. App init success, loading texture from:", tilesheetUrl);

      this.texture = await PIXI.Assets.load(tilesheetUrl);
      console.log("3. Texture load success", this.texture);
      
      this.cameraContainer = new PIXI.Container();
      this.app.stage.addChild(this.cameraContainer);

      this.layers.map = new PIXI.Container();
      this.cameraContainer.addChild(this.layers.map);

      this.layers.entity = new PIXI.Container();
      this.cameraContainer.addChild(this.layers.entity);

      this.layers.ui = new PIXI.Container();
      this.app.stage.addChild(this.layers.ui); // 고정 UI 레이어

      setupMapLayer(this.layers.map, this.texture, customMap);
      setupEntityLayer(this.layers.entity, this.texture);
      setupUILayer(this.layers.ui);
      console.log("PixiJS Init completed. Map, Entity & UI containers added.");
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
        this.cameraContainer.x = this.app.screen.width / 2 - me.x - 10;
        this.cameraContainer.y = this.app.screen.height / 2 - me.y - 10;
      }

      updateEntities(this.layers.entity, players, myId, items, traps, this.texture);
      updateUI(this.layers.ui, players, myId, this.app.screen.width, this.app.screen.height, this.cameraContainer.x, this.cameraContainer.y);
    } catch (e) {
      console.error("PixiJS Update Error:", e);
    }
  }

  destroy() {
    try {
      if (this.app) {
        this.app.destroy(false, { children: true });
      }
    } catch (e) {
      console.warn("PixiJS destroy ignored due to React StrictMode async unmount:", e.message);
    }
  }
}
