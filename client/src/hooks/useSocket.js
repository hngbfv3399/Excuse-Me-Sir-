import { io } from "socket.io-client";




const SERVER_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "http://localhost:3001" : "/");
// const SERVER_URL = "http://localhost:3001";
const socket = io(SERVER_URL);

export default socket;
