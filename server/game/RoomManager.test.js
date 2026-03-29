const RoomManager = require("./RoomManager");

describe("RoomManager", () => {
  let io, socket1, socket2, rooms, socketIdToRoom, socketIdToNickname;
  let emittedEvents = [];

  beforeEach(() => {
    emittedEvents = [];
    io = {
      emit: jest.fn((event, data) => emittedEvents.push({ type: "io", event, data })),
      to: jest.fn((room) => ({
        emit: jest.fn((event, data) => emittedEvents.push({ type: "room", room, event, data }))
      }))
    };
    
    const createMockSocket = (id) => ({
      id,
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn((event, data) => emittedEvents.push({ type: "socket", target: id, event, data }))
    });

    socket1 = createMockSocket("socket_1");
    socket2 = createMockSocket("socket_2");

    rooms = {};
    socketIdToRoom = {};
    socketIdToNickname = { socket_1: "HostUser", socket_2: "JoinUser" };
  });

  test("방 생성 시 대기상태(waiting)여야 하며 본인이 호스트가 된다", () => {
    const rm = new RoomManager(io, rooms, socketIdToRoom, socketIdToNickname);
    rm.handleCreateRoom(socket1, { title: "Test Room", maxPlayers: 4 });
    
    expect(Object.keys(rooms).length).toBe(1);
    const roomId = Object.keys(rooms)[0];
    
    expect(rooms[roomId].hostId).toBe("socket_1");
    expect(rooms[roomId].gamePhase).toBe("waiting");
    expect(rooms[roomId].players["socket_1"].nickname).toBe("HostUser");
  });

  test("두 번째 플레이어 접속 시 다른 팀으로 배정된다 (팀 밸런싱 검증)", () => {
    const rm = new RoomManager(io, rooms, socketIdToRoom, socketIdToNickname);
    rm.handleCreateRoom(socket1, { title: "Test", maxPlayers: 4 });
    const roomId = Object.keys(rooms)[0];

    rm.handleJoinRoom(socket2, { roomId });

    const p1 = rooms[roomId].players["socket_1"];
    const p2 = rooms[roomId].players["socket_2"];

    expect(p1.team).toBeDefined();
    expect(p2.team).toBeDefined();
    expect(p1.team !== p2.team).toBe(true); // 반드시 다른 팀이어야 함
  });

  test("다인큐방에서 혼자 시작하려고 하면 거부되어야 한다 (자동시작 및 인원 검증)", () => {
    const rm = new RoomManager(io, rooms, socketIdToRoom, socketIdToNickname);
    rm.handleCreateRoom(socket1, { title: "Test", maxPlayers: 4 });
    
    // 혼자 있을 때 시작 요청
    rm.handleStart(socket1);
    
    // 알람이 발생해야 하며, 에러 메세지가 반환되어야 함
    const alertEvent = emittedEvents.find(e => e.event === "game:alert");
    expect(alertEvent).toBeDefined();
    expect(alertEvent.data).toContain("양 팀에 최소 1명");
    
    // 게임은 여전히 시작되지 않고 waiting 이어야 함
    const roomId = Object.keys(rooms)[0];
    expect(rooms[roomId].gamePhase).toBe("waiting");
  });

  test("모든 유저가 레디하지 않으면 시작 거부되어야 한다", () => {
    const rm = new RoomManager(io, rooms, socketIdToRoom, socketIdToNickname);
    rm.handleCreateRoom(socket1, { title: "Test", maxPlayers: 4 });
    const roomId = Object.keys(rooms)[0];
    rm.handleJoinRoom(socket2, { roomId });

    // socket2 (테스터) 가 준비(Ready)를 안 한 상태
    rm.handleStart(socket1);

    const alertEvent = emittedEvents.filter(e => e.event === "game:alert").pop();
    expect(alertEvent).toBeDefined();
    expect(alertEvent.data).toContain("모든 플레이어가 준비 완료");

    // socket2 가 준비 완료 후 다시 시작 시도
    rooms[roomId].players["socket_2"].isReady = true;
    rm.handleStart(socket1);

    expect(rooms[roomId].gamePhase).toBe("prep");
    expect(rooms[roomId].timeLeft).toBe(60);
  });
});
