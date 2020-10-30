import { renderHook, act } from '@testing-library/react-hooks';
import timekeeper from 'timekeeper';
import moment from 'moment';
import {
  useInterval,
  useDelay,
  useDeadline,
  useForceRenderDeadline,
  useForceRenderInterval,
} from './timer-hooks';

const SPECIAL_DAY = 299635200000;

describe('useInterval', () => {
  describe('tests with mocked time', () => {
    const advanceTime = (ms) => {
      jest.advanceTimersByTime(ms);
    };

    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should call callback with the given delay', () => {
      // Arrange
      const callback = jest.fn();
      renderHook(() => useInterval(callback, 1000));

      // Act
      act(() => {
        advanceTime(1000);
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback before the given delay', () => {
      // Arrange
      const callback = jest.fn();
      renderHook(() => useInterval(callback, 1000));

      // Act
      act(() => {
        advanceTime(999);
      });

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });

    it('should also call the callback immediately if so specified', () => {
      // Arrange
      const callback = jest.fn();
      renderHook(() => useInterval(callback, 1000, { immediate: true }));

      // Act
      act(() => {
        advanceTime(1);
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should call callback regularly', () => {
      // Arrange
      const callback = jest.fn();
      renderHook(() => useInterval(callback, 100));

      // Act
      act(() => {
        advanceTime(1000);
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(10);
    });

    it('should call callback regularly even if the callback changes inbetween', () => {
      // Arrange
      let counter = 0;
      const makeCallback = () => ({
        callback: () => {
          counter += 1;
        },
      });
      const { rerender } = renderHook(({ callback }) => useInterval(callback, 100), {
        initialProps: makeCallback(),
      });

      // Act
      act(() => {
        advanceTime(50);
        rerender(makeCallback());
        advanceTime(50);
        rerender(makeCallback());
        advanceTime(50);
        rerender(makeCallback());
        advanceTime(50);
        rerender(makeCallback());
        advanceTime(800);
      });

      // Assert
      expect(counter).toBe(10);
    });

    it('should not call callback when not active', () => {
      // Arrange
      const callback = jest.fn();
      const { rerender } = renderHook(({ active }) => useInterval(callback, 100, { active }), {
        initialProps: { active: true },
      });

      // Act
      act(() => {
        advanceTime(500);
        rerender({ active: false });
        advanceTime(1000);
        rerender({ active: true });
        advanceTime(500);
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(10);
    });

    it('should call clearInterval when timer was active and the component unmounts', () => {
      // Arrange
      setInterval.mockReturnValue(42);
      const { unmount } = renderHook(() => useInterval(() => {}, 1337));

      // Act
      act(() => unmount());

      // Assert
      expect(clearInterval).toHaveBeenCalledWith(42);
    });

    it('should not call clearInterval when timer was not active and the component unmounts', () => {
      // Arrange
      setInterval.mockReturnValue(42);
      const { unmount } = renderHook(() => useInterval(() => {}, 1337, { active: false }));

      // Act
      act(() => unmount());

      // Assert
      expect(clearInterval).toHaveBeenCalledTimes(0);
    });
  });

  describe('tests with real time', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it('should trigger a component update when the timer expires', async () => {
      // Arrange
      const callback = jest.fn();
      const { waitForNextUpdate, unmount } = renderHook(() => useInterval(callback, 10));

      // Act
      // Resolves the next time the hook renders (as the result of an asynchronous update)
      await waitForNextUpdate();
      await waitForNextUpdate();
      unmount();

      // Assert
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useDelay', () => {
  describe('tests with mocked time', () => {
    const advanceTime = (ms) => {
      jest.advanceTimersByTime(ms);
    };

    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should call callback with the given delay', () => {
      // Arrange
      const callback = jest.fn();
      renderHook(() => useDelay(callback, 1000, true));

      // Act
      act(() => {
        advanceTime(1000);
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback before the given delay', () => {
      // Arrange
      const callback = jest.fn();
      renderHook(() => useDelay(callback, 1000, true));

      // Act
      act(() => {
        advanceTime(999);
      });

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not call callback when unmounted', () => {
      // Arrange
      const callback = jest.fn();
      const { unmount } = renderHook(() => useDelay(callback, 1000, true));

      // Act
      act(() => {
        advanceTime(750);
        unmount();
        advanceTime(750);
      });

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not call callback if not active', () => {
      // Arrange
      const callback = jest.fn();
      renderHook(() => useDelay(callback, 1000, false));

      // Act
      act(() => {
        advanceTime(2000);
      });

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not call callback if delay is changed before timer expires', () => {
      // Arrange
      const callback = jest.fn();
      const { rerender } = renderHook(({ delay }) => useDelay(callback, delay, true), {
        initialProps: { delay: 1000 },
      });

      // Act
      act(() => {
        advanceTime(750);
        rerender({ delay: 500 });
        advanceTime(750);
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should trigger the callback with given delay when the timer becomes active', () => {
      // Arrange
      const callback = jest.fn();
      const { rerender } = renderHook(({ active }) => useDelay(callback, 1000, active), {
        initialProps: { active: false },
      });

      // Act
      act(() => {
        advanceTime(1500);
        rerender({ active: true });
        advanceTime(1000);
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should call clearTimeout when timer was active and the component unmounts', () => {
      // Arrange
      setTimeout.mockReturnValue(42);
      const { unmount } = renderHook(() => useDelay(() => {}, 1337));

      // Act
      act(() => unmount());

      // Assert
      expect(clearTimeout).toHaveBeenCalledWith(42);
    });

    it('should not call clearTimeout when timer was not active and the component unmounts', () => {
      // Arrange
      setTimeout.mockReturnValue(42);
      const { unmount } = renderHook(() => useDelay(() => {}, 1337, false));

      // Act
      act(() => unmount());

      // Assert
      expect(clearTimeout).toHaveBeenCalledTimes(0);
    });
  });

  describe('tests with real time', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it('should trigger a component update when the timer expires', async () => {
      // Arrange
      const callback = jest.fn();
      const { waitForNextUpdate } = renderHook(() => useDelay(callback, 10, true));

      // Act
      // Resolves the next time the hook renders (as the result of an asynchronous update)
      await waitForNextUpdate();

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useDeadline', () => {
  describe('tests with mocked time', () => {
    // Because the mocking of Date and setTimeout are not coordinated we need
    // to advance in smaller steps (because at the time the timers fire we
    // cannot have the correct absolute date time set up correctly without
    // looking into the internals of jest). This also means that in the tests
    // we need to advance a bit more than strictly needed. We could get it
    // correct by advancing per millisecond but this makes the test slow.
    const advanceTime = (ms) => {
      while (ms > 0) {
        const step = Math.min(50, ms);
        jest.advanceTimersByTime(step);
        timekeeper.travel(Date.now() + step);
        ms -= step;
      }
    };

    beforeEach(() => {
      jest.useFakeTimers();
      timekeeper.freeze();
      timekeeper.travel(SPECIAL_DAY);
    });

    afterEach(() => {
      timekeeper.reset();
    });

    it('should call callback at the given time', () => {
      // Arrange
      const callback = jest.fn(() => Date.now());
      renderHook(() => useDeadline(callback, moment.utc().add(1, 'seconds')));

      // Act
      act(() => {
        advanceTime(1100);
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.results[0].value).toBe(SPECIAL_DAY + 1000);
    });

    it('should call callback immediately if in the past', () => {
      // Arrange
      const callback = jest.fn(() => Date.now());
      renderHook(() => useDeadline(callback, moment.utc().subtract(1, 'seconds')));

      // Act
      act(() => {
        advanceTime(100);
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.results[0].value).toBe(SPECIAL_DAY);
    });

    it('should call clearTimeout when timer was active and the component unmounts', () => {
      // Arrange
      setTimeout.mockReturnValue(42);
      const { unmount } = renderHook(() => useDeadline(() => {}, moment().add(10, 'minutes')));

      // Act
      act(() => unmount());

      // Assert
      expect(clearTimeout).toHaveBeenCalledWith(42);
    });
  });

  describe('tests with real time', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it('should trigger a component update when the timer expires', async () => {
      // Arrange
      const callback = jest.fn();
      const { waitForNextUpdate } = renderHook(() =>
        useDeadline(callback, moment.utc().add(100, 'ms'))
      );

      // Act
      // Resolves the next time the hook renders (as the result of an asynchronous update)
      await waitForNextUpdate();

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useForceRenderDeadline', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('should trigger a component update when the timer expires', async () => {
    // Arrange
    const { waitForNextUpdate, result } = renderHook(() =>
      useForceRenderDeadline(moment.utc().add(100, 'ms'))
    );
    const before = result.current;

    // Act
    // Resolves the next time the hook renders (as the result of an asynchronous update)
    await waitForNextUpdate();

    // Assert
    expect(result.current).toBe(before + 1);
  });
});

describe('useForceRenderInterval', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('should trigger a component update when the timer expires', async () => {
    // Arrange
    const { waitForNextUpdate, result } = renderHook(() => useForceRenderInterval(10));
    const before = result.current;

    // Act
    // Resolves the next time the hook renders (as the result of an asynchronous update)
    await waitForNextUpdate();
    await waitForNextUpdate();

    // Assert
    expect(result.current).toBe(before + 2);
  });
});
