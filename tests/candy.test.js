import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage mock (store.js가 import 시 읽으므로 먼저 정의)
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => { store[key] = String(value); }),
        clear: vi.fn(() => { store = {}; }),
        removeItem: vi.fn((key) => { delete store[key]; }),
    };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

let candy;

beforeEach(async () => {
    candy = await import('../js/candy.js');
});

describe('기간별 가격', () => {
    it('프리셋 기간은 표대로 매겨진다', () => {
        const cost = (days) => candy.periodCandyCost({ mode: 'preset', days });
        expect(cost(7)).toBe(1);
        expect(cost(14)).toBe(2);
        expect(cost(30)).toBe(3);
        expect(cost(90)).toBe(5);
    });

    it('직접 선택 기간은 일수 구간으로 매겨진다', () => {
        const cost = (startKey, endKey) => candy.periodCandyCost({ mode: 'custom', startKey, endKey });
        expect(cost('2026-07-01', '2026-07-07')).toBe(1);  // 7일
        expect(cost('2026-07-01', '2026-07-10')).toBe(2);  // 10일
        expect(cost('2026-07-01', '2026-07-25')).toBe(3);  // 25일
        expect(cost('2026-01-01', '2026-07-01')).toBe(5);  // 30일 초과
    });

    it('뒤집힌 기간은 0으로 본다', () => {
        expect(candy.periodCandyCost({ mode: 'custom', startKey: '2026-07-10', endKey: '2026-07-01' })).toBe(0);
    });
});

describe('매달 무료 지급', () => {
    it('처음 맞는 달엔 1개 지급된다', () => {
        const next = candy.grantMonthlyCandy(candy.emptyCandy(), '2026-07');
        expect(next.free).toBe(1);
        expect(next.lastGrantMonth).toBe('2026-07');
    });

    it('같은 달엔 몇 번 호출해도 1개만 (중복 지급 없음)', () => {
        let c = candy.grantMonthlyCandy(candy.emptyCandy(), '2026-07');
        c = candy.grantMonthlyCandy(c, '2026-07');
        c = candy.grantMonthlyCandy(c, '2026-07');
        expect(c.free).toBe(1);
    });

    it('달이 바뀌면 다시 지급된다', () => {
        let c = candy.grantMonthlyCandy(candy.emptyCandy(), '2026-06');
        c = candy.grantMonthlyCandy(c, '2026-07');
        expect(c.free).toBe(2);
        expect(c.lastGrantMonth).toBe('2026-07');
    });
});

describe('사탕 소비', () => {
    it('무료분을 먼저 깎는다', () => {
        const c = { free: 2, paid: 3, lastGrantMonth: null, unlocks: {} };
        const next = candy.spendCandy(c, 1, 'k');
        expect(next.free).toBe(1);
        expect(next.paid).toBe(3);
    });

    it('무료분이 모자라면 구매분에서 마저 깎는다', () => {
        const c = { free: 1, paid: 3, lastGrantMonth: null, unlocks: {} };
        const next = candy.spendCandy(c, 3, 'k');
        expect(next.free).toBe(0);
        expect(next.paid).toBe(1);
    });

    it('총 잔량이 모자라면 실패하고 아무것도 깎지 않는다', () => {
        const c = { free: 1, paid: 1, lastGrantMonth: null, unlocks: {} };
        expect(candy.spendCandy(c, 5, 'k')).toBeNull();
    });

    it('소비 성공 시 그 기간이 해제 기록에 남는다', () => {
        const c = { free: 3, paid: 0, lastGrantMonth: null, unlocks: {} };
        const period = { mode: 'preset', days: 7 };
        const key = candy.unlockKeyOf(period, '2026-07-28');
        const next = candy.spendCandy(c, 1, key);
        expect(candy.isUnlocked(next, period, '2026-07-28')).toBe(true);
        expect(candy.isUnlocked(next, period, '2026-07-29')).toBe(false);
    });
});

describe('해제 기록 정리', () => {
    it('오늘 것만 남기고 지난 기록은 버린다', () => {
        const c = {
            free: 0, paid: 0, lastGrantMonth: null,
            unlocks: { '2026-07-27|p:7': true, '2026-07-28|p:7': true },
        };
        const pruned = candy.pruneUnlocks(c, '2026-07-28');
        expect(Object.keys(pruned.unlocks)).toEqual(['2026-07-28|p:7']);
    });
});

describe('게스트 → 계정 이관', () => {
    const mk = (free, paid, month) => ({ free, paid, lastGrantMonth: month, unlocks: {} });

    it('같은 달 무료 사탕이 양쪽에 있으면 합쳐도 1개 (중복 방지)', () => {
        const merged = candy.mergeCandyFromGuest(mk(1, 0, '2026-06'), mk(1, 0, '2026-06'));
        expect(merged.free).toBe(1);
    });

    it('게스트가 더 많이 모았으면 큰 쪽이 남는다', () => {
        const merged = candy.mergeCandyFromGuest(mk(2, 0, '2026-07'), mk(1, 0, '2026-06'));
        expect(merged.free).toBe(2);
        expect(merged.lastGrantMonth).toBe('2026-07');
    });

    it('구매 사탕은 합산된다', () => {
        const merged = candy.mergeCandyFromGuest(mk(0, 2, null), mk(0, 3, null));
        expect(merged.paid).toBe(5);
    });

    it('무료 MAX와 구매 SUM이 동시에 적용된다', () => {
        const merged = candy.mergeCandyFromGuest(mk(2, 2, '2026-07'), mk(1, 3, '2026-06'));
        expect(merged.free).toBe(2);
        expect(merged.paid).toBe(5);
    });

    it('이관 후 게스트 잔량은 0이고 지급월은 남는다 (같은 달 재지급 방지)', () => {
        const drained = candy.drainedGuestCandy(mk(2, 3, '2026-07'));
        expect(drained.free).toBe(0);
        expect(drained.paid).toBe(0);
        expect(drained.lastGrantMonth).toBe('2026-07');
    });
});

describe('값 보정', () => {
    it('망가진 값은 빈 사탕으로 되돌린다', () => {
        expect(candy.normalizeCandy(null)).toEqual(candy.emptyCandy());
        expect(candy.normalizeCandy({ free: -5, paid: 'x' })).toEqual(candy.emptyCandy());
    });
});
