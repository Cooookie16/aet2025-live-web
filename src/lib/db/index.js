export * from './maps';
export * from './teams';
export * from './state';
import { getState, setState } from './state';

/**
 * Compatibility wrapper for legacy kvGet
 * @param {string} key 
 */
export function kvGet(key) {
  // SQLite implementation is synchronous but returns plain object
  return getState(key);
}

/**
 * Compatibility wrapper for legacy kvSet
 * @param {string} key 
 * @param {any} value 
 */
export function kvSet(key, value) {
  // SQLite implementation is synchronous
  setState(key, value);
  // Return a promise to maintain async interface compatibility
  return Promise.resolve();
}
