// Stand-in for the platform `sdk`: records every Bot API call and lets a test make chosen methods fail.
import { database, resetTables } from './sdk-db.mjs';

export class BotApiError extends Error {
  constructor(description, code) {
    super(description);
    this.description = description;
    this.code = code;
  }
}

export const calls = [];
const failures = new Map();
const answers = new Map();

export const api = new Proxy({}, {
  get: (_, method) => async (params = {}) => {
    calls.push({ method, params });
    const reason = failures.has(method) ? failures.get(method)(params) : false;
    if (reason) throw new BotApiError(typeof reason === 'string' ? reason : 'Bad Request', reason.code);
    const answer = answers.get(method);
    return answer ? answer(params) : { message_id: 1 };
  },
});

export const db = database;
export const fetch = async () => ({ ok: true });

export function failWhen(method, predicate) {
  failures.set(method, predicate);
}

export function answer(method, fn) {
  answers.set(method, fn);
}

export function reset() {
  calls.length = 0;
  failures.clear();
  answers.clear();
  resetTables();
}

export const called = (method) => calls.filter((c) => c.method === method).map((c) => c.params);
