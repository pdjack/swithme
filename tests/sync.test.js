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

let isEmptyData, dataEqual, decideSync;

beforeEach(async () => {
    const mod = await import('../js/sync.js');
    ({ isEmptyData, dataEqual, decideSync } = mod);
});

const emptyData = () => ({
    tasks: [], timetables: [{ id: 't', type: 'record', history: [], plans: [] }],
    activeTimetableId: 't', subjects: [{ id: 'A', name: 'A' }],
    reflectionItems: [{ id: 'x' }], reflections: {}, analysisResults: [],
    habits: {}, habitSeedLog: {},
});
const withTasks = () => ({ ...emptyData(), tasks: [{ id: '1', title: '공부' }] });

describe('isEmptyData', () => {
    it('콘텐츠 없으면 빈 것으로 판정 (기본 카테고리·회고항목 있어도)', () => {
        expect(isEmptyData(emptyData())).toBe(true);
    });
    it('null/undefined도 빈 것', () => {
        expect(isEmptyData(null)).toBe(true);
        expect(isEmptyData(undefined)).toBe(true);
    });
    it('할 일 있으면 빈 것 아님', () => {
        expect(isEmptyData(withTasks())).toBe(false);
    });
    it('회고 기록 있으면 빈 것 아님', () => {
        expect(isEmptyData({ ...emptyData(), reflections: { '2026-07-24': { total: 3 } } })).toBe(false);
    });
    it('타임테이블 history 있으면 빈 것 아님', () => {
        const d = emptyData();
        d.timetables = [{ id: 't', type: 'record', history: [{ id: 'h' }], plans: [] }];
        expect(isEmptyData(d)).toBe(false);
    });
});

describe('dataEqual', () => {
    it('같은 콘텐츠는 동일', () => {
        expect(dataEqual(withTasks(), withTasks())).toBe(true);
    });
    it('다른 콘텐츠는 상이', () => {
        expect(dataEqual(withTasks(), emptyData())).toBe(false);
    });
});

describe('decideSync', () => {
    it('둘 다 비면 noop', () => {
        expect(decideSync(emptyData(), emptyData())).toBe('noop');
        expect(decideSync(emptyData(), null)).toBe('noop');
    });
    it('로컬만 데이터 → push', () => {
        expect(decideSync(withTasks(), emptyData())).toBe('push');
        expect(decideSync(withTasks(), null)).toBe('push');
    });
    it('클라우드만 데이터 → pull', () => {
        expect(decideSync(emptyData(), withTasks())).toBe('pull');
    });
    it('양쪽 데이터 같음 → noop', () => {
        expect(decideSync(withTasks(), withTasks())).toBe('noop');
    });
    it('양쪽 데이터 다름 → conflict', () => {
        const other = { ...withTasks(), tasks: [{ id: '2', title: '운동' }] };
        expect(decideSync(withTasks(), other)).toBe('conflict');
    });
});
