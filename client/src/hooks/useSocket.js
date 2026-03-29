import { io } from "socket.io-client";

// 1순위: .env에 입력된 터널링/원격 서버 주소
// 2순위: 터널링 배포판 통합 실행 시 같은 서버 (/)
// 3순위: 로컬 React 개발(npm run dev) 중일 때는 localhost:3001
const SERVER_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "http://localhost:3001" : "/");
// const SERVER_URL = "http://localhost:3001";
const socket = io(SERVER_URL);

export default socket;
