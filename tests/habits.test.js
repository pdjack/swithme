import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage mock
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key) => { delete store[key]; })
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// confirm/prompt mock for jsdom
globalThis.confirm = () => true;
globalThis.prompt = () => '';

describe('habits.js — seedHabitsForDate', () => {
  let store;
  let habits;

  beforeEach(async () => {
    localStorageMock.clear();
    vi.resetModules();
    store = await import('../js/store.js');
    habits = await import('../js/habits.js');

    // 활성 plan 타임테이블 보장
    const planTt = store.state.timetables.find(t => !t.isHabit && t.type === 'plan');
    if (!planTt) {
      const newTt = {
        id: 'tt_plan_for_test',
        name: '테스트 플랜',
        type: 'plan',
        history: [],
        plans: []
      };
      store.state.timetables.push(newTt);
      store.state.activeTimetableId = newTt.id;
    } else {
      store.state.activeTimetableId = planTt.id;
    }
  });

  it('습관 타임테이블 8개가 자동 생성된다', () => {
    const habitTts = store.state.timetables.filter(t => t.isHabit);
    expect(habitTts).toHaveLength(8);
    const keys = habitTts.map(t => t.habitDayKey).sort();
    expect(keys).toEqual(['daily', 'fri', 'mon', 'sat', 'sun', 'thu', 'tue', 'wed']);
  });

  it('요일 습관 할 일이 state.tasks에 시드된다', () => {
    // 2026-04-27은 월요일
    const dateKey = '2026-04-27';
    expect(new Date(dateKey + 'T00:00:00').getDay()).toBe(1);

    store.state.habits.mon.tasks.push({ subject: 'ENG', name: '월요 습관 할 일' });
    habits.seedHabitsForDate(dateKey);

    const seeded = store.state.tasks.filter(t => t.date === dateKey && t.fromHabit);
    expect(seeded.some(t => t.name === '월요 습관 할 일')).toBe(true);
  });

  it('매일 습관과 요일 습관이 모두 시드된다 (충돌 없을 때)', () => {
    const dateKey = '2026-04-27'; // 월
    store.state.habits.daily.tasks.push({ subject: 'ENG', name: '매일 운동' });
    store.state.habits.mon.tasks.push({ subject: 'MATH', name: '월요 수학' });

    habits.seedHabitsForDate(dateKey);
    const seeded = store.state.tasks.filter(t => t.date === dateKey);
    expect(seeded.some(t => t.name === '매일 운동')).toBe(true);
    expect(seeded.some(t => t.name === '월요 수학')).toBe(true);
  });

  it('같은 키(subject+name)로 매일/요일 양쪽에 있으면 한 번만 시드된다', () => {
    const dateKey = '2026-04-27';
    store.state.habits.daily.tasks.push({ subject: 'ENG', name: '단어암기' });
    store.state.habits.mon.tasks.push({ subject: 'ENG', name: '단어암기' });

    habits.seedHabitsForDate(dateKey);
    const matched = store.state.tasks.filter(t =>
      t.date === dateKey && t.subject === 'ENG' && t.name === '단어암기'
    );
    expect(matched).toHaveLength(1);
  });

  it('이미 시드된 항목은 재호출 시 다시 추가되지 않는다', () => {
    const dateKey = '2026-04-27';
    store.state.habits.mon.tasks.push({ subject: 'KOR', name: '국어 독해' });

    habits.seedHabitsForDate(dateKey);
    const beforeCount = store.state.tasks.filter(t => t.date === dateKey).length;

    // 사용자가 시드된 task를 삭제했다고 가정
    store.state.tasks = store.state.tasks.filter(t =>
      !(t.date === dateKey && t.subject === 'KOR' && t.name === '국어 독해')
    );

    // 재시드
    habits.seedHabitsForDate(dateKey);
    const afterCount = store.state.tasks.filter(t => t.date === dateKey).length;
    // 사용자가 삭제한 항목은 다시 추가되지 않아야 한다
    expect(afterCount).toBeLessThan(beforeCount);
  });

  it('습관 플랜이 활성 plan 타임테이블에 시드된다', () => {
    const dateKey = '2026-04-27'; // 월
    const monTt = store.getHabitTimetable('mon');
    monTt.plans.push({
      id: 'h1',
      startSlot: 0,
      endSlot: 5,
      subject: 'ENG',
      memo: '아침 영어'
    });

    habits.seedHabitsForDate(dateKey);

    const target = store.state.timetables.find(t => !t.isHabit && t.type === 'plan');
    const seededPlan = target.plans.find(p => p.fromHabit && p.subject === 'ENG' && p.startSlot === 0);
    expect(seededPlan).toBeTruthy();
    expect(seededPlan.date).toBe(dateKey);
  });

  it('사용자 기존 슬롯과 충돌하면 매일/요일 습관 플랜은 시드되지 않는다', () => {
    const dateKey = '2026-04-27';
    const target = store.state.timetables.find(t => !t.isHabit && t.type === 'plan');
    target.plans.push({
      id: 'user1',
      startSlot: 0,
      endSlot: 5,
      subject: 'KOR',
      memo: '사용자 직접',
      date: dateKey
    });

    const dailyTt = store.getHabitTimetable('daily');
    dailyTt.plans.push({
      id: 'h_daily',
      startSlot: 0,
      endSlot: 5,
      subject: 'ENG',
      memo: '매일 영어'
    });

    habits.seedHabitsForDate(dateKey);
    const conflictSeed = target.plans.find(p => p.fromHabit && p.startSlot === 0);
    expect(conflictSeed).toBeFalsy();
  });

  it('요일 습관 플랜이 매일 습관 플랜을 슬롯 충돌 시 우선한다', () => {
    const dateKey = '2026-04-27';
    const dailyTt = store.getHabitTimetable('daily');
    const monTt = store.getHabitTimetable('mon');

    dailyTt.plans.push({ id: 'd', startSlot: 12, endSlot: 17, subject: 'ENG' });
    monTt.plans.push({ id: 'm', startSlot: 12, endSlot: 17, subject: 'MATH' });

    habits.seedHabitsForDate(dateKey);

    const target = store.state.timetables.find(t => !t.isHabit && t.type === 'plan');
    const seededAt12 = target.plans.find(p => p.fromHabit && p.startSlot === 12);
    expect(seededAt12).toBeTruthy();
    expect(seededAt12.subject).toBe('MATH'); // 요일 우선
  });
});
