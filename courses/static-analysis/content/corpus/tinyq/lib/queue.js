'use strict';

class Queue {
  constructor(limit) {
    this.items = [];
    this.limit = limit || Infinity;
    this.listeners = {};
  }

  on(event, listener) {
    (this.listeners[event] = this.listeners[event] || []).push(listener);
  }

  emit(event, value) {
    for (const l of this.listeners[event] || []) l(value);
  }

  push(item) {
    if (this.items.length >= this.limit) {
      this.emit('drop', item);
      return false;
    }
    this.items.push(item);
    this.emit('push', item);
    return true;
  }

  shift() {
    const item = this.items.shift();
    if (item === undefined) return undefined;
    this.emit('shift', item);
    return item;
  }

  drain(handler) {
    let handled = 0;
    while (this.items.length > 0) {
      const item = this.shift();
      try {
        handler(item);
        handled++;
      } catch (e) {
        this.emit('error', e);
        break;
      } finally {
        this.emit('settled', item);
      }
    }
    return handled;
  }

  find(predicate) {
    for (const item of this.items) {
      if (predicate(item)) {
        return item;
      }
      return undefined;
    }
  }

  priorityOf(item) {
    switch (typeof item) {
      case 'number':
        return item;
      case 'string':
        return item.length;
      default:
        return 0;
    }
  }
}

module.exports = { Queue };
