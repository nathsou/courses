'use strict';

function retry(task, attempts) {
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return task(i);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function backoff(attempt) {
  let delay = 100;
  delay = delay * 2 ** attempt;
  if (delay > 10000) {
    delay = 10000;
  }
  return delay;
}

function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  };
}

module.exports = { retry, backoff, once };
