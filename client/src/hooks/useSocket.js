import { io } from "socket.io-client";

// 개발 모드: localhost:3001 / 프로덕션(터널/배포): 현재 페이지의 origin과 동일한 서버
const SERVER_URL =
  import.meta.env.VITE_HOSTSERVER ||
  (import.meta.env.DEV ? "http://localhost:3001" : window.location.origin);

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
});

export default socket;
