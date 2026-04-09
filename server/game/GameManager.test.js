const GameManager = require('./GameManager');

describe('GameManager Core Logic', () => {
    let io, rooms, socketIdToRoom;
    let gameManager;

    beforeEach(() => {
        io = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        };
        rooms = {
            'room1': {
                score: 0,
                maxScore: 10,
                gamePhase: 'playing',
                items: [],
                players: {
                    'p1': { x: 10, y: 10, isTagger: false, isJailed: false, carriedItem: false }, // Runner 1
                    'p3': { x: 50, y: 50, isTagger: false, isJailed: false, carriedItem: false }, // Runner 2
                    'p2': { x: 500, y: 500, isTagger: true, isJailed: false } // Tagger
                }
            }
        };
        socketIdToRoom = {
            'p1': 'room1',
            'p2': 'room1',
            'p3': 'room1'
        };
        gameManager = new GameManager(io, rooms, socketIdToRoom);
    });

    test('1. 의적의 금괴 획득 및 반납 (Score Update)', () => {
        // 아이템 추가 후 획득 범위 안으로 파고들기
        rooms['room1'].items.push({ id: 'gold_1', x: 100, y: 100 });
        gameManager.handlePlayerMove({ id: 'p1' }, { x: 110, y: 110 }); // 20px 안쪽 교집합

        expect(rooms['room1'].players['p1'].carriedItem).toBe(true);
        expect(rooms['room1'].items.length).toBe(0); // 맵에서 금괴 삭제

        // 160 ~ 360 존 (안전 구역) 안으로 이동하여 점수내기
        gameManager.handlePlayerMove({ id: 'p1' }, { x: 200, y: 200 });

        expect(rooms['room1'].players['p1'].carriedItem).toBe(false);
        expect(rooms['room1'].score).toBe(1);
    });

    test('2. 관군의 도망자 포획 및 금괴 드랍 로직', () => {
        rooms['room1'].players['p1'].carriedItem = true;
        
        // p2(술래)가 p1(의적) 방향으로 이동하여 잡는다 (p1 좌표 10, 10 근접)
        gameManager.handlePlayerMove({ id: 'p2' }, { x: 15, y: 15 });

        expect(rooms['room1'].players['p1'].isJailed).toBe(true);
        expect(rooms['room1'].players['p1'].carriedItem).toBe(false);
        expect(rooms['room1'].items.length).toBe(1); // 들고 있던 금괴 떨굼
        expect(rooms['room1'].players['p1'].x).toBe(800); // 감옥 좌표로 텔포됨
        
        // 하지만 아직 다른 도망자(p3) 가 살아있으므로 게임은 안끝남
        expect(rooms['room1'].gamePhase).toBe('playing');
        
        // p3까지 잡으면 게임 종료
        gameManager.handlePlayerMove({ id: 'p2' }, { x: 55, y: 55 });
        expect(rooms['room1'].players['p3'].isJailed).toBe(true);
        expect(rooms['room1'].gamePhase).toBe('ended');
    });

    test('3. 감옥 구출 시스템 정상 해제 검증', () => {
        // p1을 감옥에 가둠
        rooms['room1'].players['p1'].isJailed = true;
        rooms['room1'].players['p1'].x = 800;

        // p3 가 구출 명령어를 날림 (게임매니저는 이 명령어를 받았을 시 동작함)
        gameManager.handleRescueComplete({ id: 'p3' });

        expect(rooms['room1'].players['p1'].isJailed).toBe(false);
        expect(rooms['room1'].players['p1'].x).toBe(240); // 기본 스폰구역 탈출
        expect(io.emit).toHaveBeenCalledWith("game:alert", expect.stringMatching(/파괴되어 동료들이 탈출해/));
    });
});
