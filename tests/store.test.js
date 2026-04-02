import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage mock
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('store.js', () => {
  let store;

  beforeEach(async () => {
    localStorageMock.clear();
    vi.resetModules();
    store = await import('../js/store.js');
  });

  describe('state 초기화', () => {
    it('기본 과목 5개가 존재해야 한다', () => {
      expect(store.state.subjects).toHaveLength(5);
      expect(store.state.subjects.map((s) => s.id)).toEqual(['ENG', 'MATH', 'KOR', 'SCI', 'OTH']);
    });

    it('타이머 기본값이 25분(1500초)이어야 한다', () => {
      expect(store.state.timer.seconds).toBe(1500);
      expect(store.state.timer.totalDuration).toBe(1500);
      expect(store.state.timer.mode).toBe('timer');
      expect(store.state.timer.isRunning).toBe(false);
    });

    it('selectedDate가 오늘 날짜(YYYY-MM-DD)여야 한다', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(store.state.selectedDate).toBe(today);
    });
  });

  describe('saveToLocal()', () => {
    it('state의 핵심 데이터를 localStorage에 저장해야 한다', () => {
      store.state.tasks.push({ id: 99, subject: 'ENG', name: 'test', duration: '0s', completed: false });
      store.saveToLocal();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('switme_tasks', expect.any(String));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('switme_timetables', expect.any(String));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('switme_active_timetable_id', expect.any(String));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('switme_subjects', expect.any(String));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('switme_reflections', expect.any(String));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('switme_analysis', expect.any(String));
    });

    it('저장된 tasks JSON에 추가한 항목이 포함되어야 한다', () => {
      store.state.tasks.push({ id: 100, subject: 'MATH', name: '수학 문제', duration: '0s', completed: false });
      store.saveToLocal();

      const lastCall = localStorageMock.setItem.mock.calls.filter((c) => c[0] === 'switme_tasks').pop();
      const savedTasks = JSON.parse(lastCall[1]);
      expect(savedTasks.some((t) => t.id === 100)).toBe(true);
    });
  });

  describe('getSubjectColor()', () => {
    it('존재하는 과목 ID의 색상을 반환해야 한다', () => {
      expect(store.getSubjectColor('ENG')).toBe('#E74C3C');
      expect(store.getSubjectColor('MATH')).toBe('#3F51B5');
    });

    it('존재하지 않는 과목 ID에 대해 기본 색상을 반환해야 한다', () => {
      expect(store.getSubjectColor('UNKNOWN')).toBe('#8E8E93');
    });
  });

  describe('formatSeconds()', () => {
    it('0초를 00:00:00으로 변환해야 한다', () => {
      expect(store.formatSeconds(0)).toBe('00:00:00');
    });

    it('1500초(25분)를 00:25:00으로 변환해야 한다', () => {
      expect(store.formatSeconds(1500)).toBe('00:25:00');
    });

    it('3661초를 01:01:01로 변환해야 한다', () => {
      expect(store.formatSeconds(3661)).toBe('01:01:01');
    });
  });
});
