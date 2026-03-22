import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// DOM mock
const mockElements = {};
function createMockElement(id) {
  mockElements[id] = {
    textContent: '',
    value: '',
    style: {},
    classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
  };
  return mockElements[id];
}

vi.stubGlobal(
  'document',
  (() => {
    const elements = {
      'timer-display': createMockElement('timer-display'),
      'zen-timer-display': createMockElement('zen-timer-display'),
      'timer-progress': createMockElement('timer-progress'),
      'zen-overlay': createMockElement('zen-overlay'),
    };
    return {
      getElementById: vi.fn((id) => elements[id] || null),
      querySelector: vi.fn(() => createMockElement('btn-start')),
      querySelectorAll: vi.fn(() => []),
      addEventListener: vi.fn(),
    };
  })(),
);

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
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('timer.js', () => {
  let timer;
  let store;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    localStorageMock.clear();
    store = await import('../js/store.js');
    timer = await import('../js/timer.js');
  });

  afterEach(() => {
    vi.useRealTimers();
    if (store.state.timer.interval) {
      clearInterval(store.state.timer.interval);
      store.state.timer.interval = null;
    }
  });

  describe('updateTimerDisplay()', () => {
    it('타이머 모드에서 남은 시간을 MM:SS 형식으로 표시해야 한다', () => {
      store.state.timer.mode = 'timer';
      store.state.timer.seconds = 1500;
      timer.updateTimerDisplay();

      expect(mockElements['timer-display'].textContent).toBe('25:00');
    });

    it('스톱워치 모드에서 경과 시간을 표시해야 한다', () => {
      store.state.timer.mode = 'stopwatch';
      store.state.timer.stopwatchSeconds = 65;
      timer.updateTimerDisplay();

      expect(mockElements['timer-display'].textContent).toBe('01:05');
    });

    it('타이머 모드에서 progress ring의 offset을 계산해야 한다', () => {
      store.state.timer.mode = 'timer';
      store.state.timer.seconds = 750; // 절반
      store.state.timer.totalDuration = 1500;
      timer.updateTimerDisplay();

      const expectedOffset = 301.6 * (1 - 750 / 1500);
      expect(mockElements['timer-progress'].style.strokeDashoffset).toBe(expectedOffset);
    });
  });

  describe('startTimer()', () => {
    it('타이머 시작 시 isRunning이 true가 되어야 한다', () => {
      timer.startTimer();
      expect(store.state.timer.isRunning).toBe(true);
    });

    it('타이머 시작 시 sessionStartTime이 설정되어야 한다', () => {
      timer.startTimer();
      expect(store.state.timer.sessionStartTime).toBeInstanceOf(Date);
    });

    it('1초 경과 후 타이머 모드에서 seconds가 1 감소해야 한다', () => {
      store.state.timer.mode = 'timer';
      store.state.timer.seconds = 1500;
      timer.startTimer();

      vi.advanceTimersByTime(1000);
      expect(store.state.timer.seconds).toBe(1499);
    });

    it('1초 경과 후 스톱워치 모드에서 stopwatchSeconds가 1 증가해야 한다', () => {
      store.state.timer.mode = 'stopwatch';
      store.state.timer.stopwatchSeconds = 0;
      timer.startTimer();

      vi.advanceTimersByTime(1000);
      expect(store.state.timer.stopwatchSeconds).toBe(1);
    });
  });

  describe('resetTimer()', () => {
    it('타이머를 25분(1500초)으로 초기화해야 한다', () => {
      store.state.timer.seconds = 500;
      store.state.timer.isRunning = true;
      timer.resetTimer();

      expect(store.state.timer.seconds).toBe(1500);
      expect(store.state.timer.isRunning).toBe(false);
      expect(store.state.timer.stopwatchSeconds).toBe(0);
    });
  });

  describe('stopTimer()', () => {
    it('타이머 중지 시 isRunning이 false가 되어야 한다', () => {
      timer.startTimer();
      timer.stopTimer();
      expect(store.state.timer.isRunning).toBe(false);
    });
  });
});
