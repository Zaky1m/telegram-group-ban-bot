// Minimal in-memory stand-in for the platform's `sdk/db`: only the query shapes lib/store.js uses.
const tables = new Map();

class Column {
  constructor() {
    this.fallback = null;
  }
  primaryKey() { return this; }
  notNull() { return this; }
  unique() { return this; }
  default(value) { this.fallback = value; return this; }
}

export const integer = () => new Column();
export const text = () => new Column();
export const index = () => ({ on: () => ({}) });

export function table(name, columns) {
  const t = { name, columns };
  for (const [key, col] of Object.entries(columns)) {
    col.key = key;
    t[key] = col;
  }
  return t;
}

const rowsOf = (t) => {
  if (!tables.has(t.name)) tables.set(t.name, []);
  return tables.get(t.name);
};

export const resetTables = () => tables.clear();

export const eq = (col, value) => ({ test: (r) => r[col.key] === value });
export const gt = (col, value) => ({ test: (r) => r[col.key] > value });
export const lte = (col, value) => ({ test: (r) => r[col.key] <= value });
export const and = (...parts) => ({ test: (r) => parts.every((p) => p.test(r)) });
export const asc = (col) => ({ key: col.key });

// Only the case-insensitive equality used by findKnownUser is supported.
export function sql(strings, ...values) {
  if (strings.join('?') !== 'lower(?) = ?') throw new Error(`fake sdk/db: unsupported sql: ${strings.join('?')}`);
  const [col, expected] = values;
  return { test: (r) => String(r[col.key] ?? '').toLowerCase() === expected };
}

const compare = (key) => (a, b) => {
  if (a[key] === b[key]) return 0;
  if (a[key] == null) return -1;
  if (b[key] == null) return 1;
  return a[key] < b[key] ? -1 : 1;
};

function selectQuery(t) {
  let test = () => true;
  let order = null;
  const q = {
    from: () => q,
    where: (p) => { test = p.test; return q; },
    orderBy: (o) => { order = o; return q; },
    all: async () => {
      const rows = rowsOf(t).filter(test).map((r) => ({ ...r }));
      return order ? rows.sort(compare(order.key)) : rows;
    },
    get: async () => {
      const row = rowsOf(t).find(test);
      return row ? { ...row } : undefined;
    },
  };
  return q;
}

function insertQuery(t) {
  let values;
  let conflict = null;
  let returning = false;
  const q = {
    values: (v) => { values = v; return q; },
    onConflictDoUpdate: ({ target, set }) => { conflict = { target, set }; return q; },
    onConflictDoNothing: ({ target }) => { conflict = { target, set: null }; return q; },
    returning: () => { returning = true; return q; },
    run: async () => {
      const rows = rowsOf(t);
      const existing = conflict && rows.find((r) => r[conflict.target.key] === values[conflict.target.key]);
      if (existing) {
        if (!conflict.set) return returning ? [] : undefined;
        Object.assign(existing, conflict.set);
        return returning ? [{ ...existing }] : undefined;
      }
      const row = {};
      for (const [key, col] of Object.entries(t.columns)) row[key] = values[key] ?? col.fallback;
      rows.push(row);
      return returning ? [{ ...row }] : undefined;
    },
  };
  return q;
}

function updateQuery(t) {
  let changes;
  let test = () => true;
  const q = {
    set: (c) => { changes = c; return q; },
    where: (p) => { test = p.test; return q; },
    run: async () => { rowsOf(t).filter(test).forEach((r) => Object.assign(r, changes)); },
  };
  return q;
}

function deleteQuery(t) {
  let test = () => true;
  let returning = false;
  const q = {
    where: (p) => { test = p.test; return q; },
    returning: () => { returning = true; return q; },
    run: async () => {
      const rows = rowsOf(t);
      const gone = rows.filter(test);
      tables.set(t.name, rows.filter((r) => !test(r)));
      return returning ? gone : undefined;
    },
  };
  return q;
}

export const database = {
  select: () => ({ from: (t) => selectQuery(t) }),
  insert: (t) => insertQuery(t),
  update: (t) => updateQuery(t),
  delete: (t) => deleteQuery(t),
};
