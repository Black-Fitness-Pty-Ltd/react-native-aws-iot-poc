import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import invariant from 'invariant';

function nop() {}

/**
 * Execute the given callback at the specified interval. The interval timer is
 * only reset if the delay changes (so updating the callback keeps the interval
 * ticking regularly.
 *
 * @param {Function} callback - callback to invoke when timer fires
 * @param {Number} delay - interval in which the timer fires
 * @param {Object} options
 * @param {Boolean} [options.active=true] - indicates wether or not the timer is active
 * @param {Boolean} [options.immediate=false] - indicates wether or not the callback should also be invoked immediately after the timer becomes active
 */
export const useInterval = (callback, delay, { active = true, immediate = false } = {}) => {
  const [counter, setCounter] = useState(0);
  const callbackRef = useRef();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      setCounter((value) => value + 1); // force re-render
      callbackRef.current();
    };
    if (active) {
      if (immediate) callbackRef.current();
      invariant(delay >= 0, 'Delay must be positive');
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay, active, immediate]);

  return counter;
};

/**
 * Helper wrapper around useInterval for forcing a re-render at the given
 * interval. Syntactic sugar for passing a no-op callback function to
 * useInterval.
 */
export function useForceRenderInterval(delay, options) {
  return useInterval(nop, delay, options);
}

/**
 * Executes the given callback with the given delay as soon as, and as long as,
 * active is set to true. The callback is not called if active becomes false
 * within the delay period. Note that the timer is reset if the delay is
 * changed.
 *
 * @param {Function} callback - callback to invoke when timer fires
 * @param {Number} delay - interval in which the timer fires
 * @param {Boolean} [active=true] - indicates wether or not the timer is active
 */
export const useDelay = (callback, delay, active = true) => {
  const [, setCounter] = useState(0);
  const callbackRef = useRef();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      setCounter((value) => value + 1); // force re-render
      callbackRef.current();
    };
    if (active) {
      const id = setTimeout(tick, Math.max(0, delay));
      return () => clearTimeout(id);
    }
  }, [delay, active]);
};

/**
 * Executes the given callback at the given deadline (absolute moment in time).
 * The callback will be called within a few milliseconds after the specified
 * deadline. If the time is in the past the callback is called immediately.
 *
 * This hook works by repeatedly setting a timeout for 75% of the remaining
 * time until the deadline until that remaining time drops below 250ms. Then we
 * set a timeout for the exact remaining time. This way we can call the
 * callback at a very precices time only a few milliseconds after the deadline.
 *
 * @param {Function} callback - callback to invoke when timer fires
 * @param {*} deadline - Moment in time at which to call the deadline. The
 *     value can be anything that can be passed to the moment constructor.
 */
export const useDeadline = (callback, time) => {
  const [counter, setCounter] = useState(0);
  const callbackRef = useRef();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const timestamp = moment.utc(time).valueOf();

  useEffect(() => {
    const tick = () => {
      setCounter((value) => value + 1); // force re-render
      callbackRef.current();
    };

    // Be aware of the slightly complex use of closures and sync callbacks in
    // the next block of code..
    let timer = null;
    const makeTimer = () => {
      const remaining = timestamp - moment.utc().valueOf();
      if (remaining <= 0) {
        timer = null;
        tick();
      } else {
        const delay = remaining < 250 ? remaining : Math.ceil(remaining * 0.75);
        invariant(delay >= 0, 'Delay must be positive');
        timer = setTimeout(makeTimer, delay);
      }
    };
    //setImmediate(makeTimer, 0);
    makeTimer();

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [timestamp]);

  return counter;
};

/**
 * Helper wrapper around useDeadline for forcing a re-render at the given
 * point in time. Syntactic sugar for passing a no-op callback function to
 * useDeadline.
 */
export function useForceRenderDeadline(time) {
  return useDeadline(nop, time);
}
