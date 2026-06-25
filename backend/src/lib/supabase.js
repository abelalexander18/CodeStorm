// src/lib/supabase.js
// Supabase client — uses the SECRET key (server-side only)
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

let supabase;

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn(
    '[Supabase] SUPABASE_URL or SUPABASE_SECRET_KEY is not set in .env — Using local mock database.'
  );

  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  class MockDatabase {
    constructor() {
      // Save the mock database file inside the workspace
      this.filePath = path.join(__dirname, '../../../database/mock_db.json');
      this.data = {
        students: [],
        tasks: [],
        attendance: []
      };
      this.load();
    }

    load() {
      try {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (fs.existsSync(this.filePath)) {
          const fileContent = fs.readFileSync(this.filePath, 'utf8');
          this.data = JSON.parse(fileContent);
        } else {
          this.save();
        }
      } catch (err) {
        console.error('[Mock DB] Failed to load mock database:', err);
      }
    }

    save() {
      try {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
      } catch (err) {
        console.error('[Mock DB] Failed to save mock database:', err);
      }
    }

    async run(builder) {
      const table = this.data[builder.table];
      if (!table) {
        throw new Error(`Table ${builder.table} not found in mock database.`);
      }

      if (builder.operation === 'insert') {
        const records = Array.isArray(builder.payload) ? builder.payload : [builder.payload];
        const inserted = [];

        for (const rec of records) {
          if (builder.table === 'students') {
            const duplicatePhone = table.find(s => s.phone === rec.phone);
            const duplicateEmail = table.find(s => s.email === rec.email);
            if (duplicatePhone || duplicateEmail) {
              const err = new Error('A student with this phone or email already exists.');
              err.code = '23505'; // Postgres duplicate key error code
              throw err;
            }
          }

          const newRec = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...rec
          };
          table.push(newRec);
          inserted.push(newRec);
        }

        this.save();
        return builder.isSingle ? inserted[0] : inserted;
      }

      if (builder.operation === 'upsert') {
        const records = Array.isArray(builder.payload) ? builder.payload : [builder.payload];
        const upserted = [];

        for (const rec of records) {
          let index = -1;
          if (builder.table === 'attendance') {
            index = table.findIndex(a => a.phone === rec.phone && a.subject === rec.subject);
          }

          if (index !== -1) {
            table[index] = {
              ...table[index],
              ...rec,
              updated_at: new Date().toISOString()
            };
            upserted.push(table[index]);
          } else {
            const newRec = {
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              ...rec
            };
            table.push(newRec);
            upserted.push(newRec);
          }
        }

        this.save();
        return builder.isSingle ? upserted[0] : upserted;
      }

      if (builder.operation === 'select') {
        let results = [...table];

        for (const filter of builder.filters) {
          results = results.filter(row => row[filter.field] === filter.value);
        }

        for (const order of builder.orders) {
          results.sort((a, b) => {
            const valA = new Date(a[order.field]).getTime() || a[order.field];
            const valB = new Date(b[order.field]).getTime() || b[order.field];
            if (valA < valB) return order.ascending ? -1 : 1;
            if (valA > valB) return order.ascending ? 1 : -1;
            return 0;
          });
        }

        if (builder.isSingle) {
          if (results.length === 0) {
            return null;
          }
          return results[0];
        }

        return results;
      }

      throw new Error(`Unsupported operation: ${builder.operation}`);
    }
  }

  const mockDb = new MockDatabase();

  class MockBuilder {
    constructor(table, db) {
      this.table = table;
      this.db = db;
      this.operation = null;
      this.payload = null;
      this.filters = [];
      this.orders = [];
      this.isSingle = false;
      this.upsertOptions = null;
    }

    insert(payload) {
      this.operation = 'insert';
      this.payload = payload;
      return this;
    }

    upsert(payload, options) {
      this.operation = 'upsert';
      this.payload = payload;
      this.upsertOptions = options;
      return this;
    }

    select(fields = '*') {
      if (!this.operation) {
        this.operation = 'select';
      }
      return this;
    }

    eq(field, value) {
      this.filters.push({ field, value });
      return this;
    }

    order(field, options = {}) {
      this.orders.push({ field, ascending: options.ascending !== false });
      return this;
    }

    single() {
      this.isSingle = true;
      return this;
    }

    then(onFulfilled, onRejected) {
      return this.execute().then(onFulfilled, onRejected);
    }

    async execute() {
      try {
        const data = await this.db.run(this);
        return { data, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message, code: err.code } };
      }
    }
  }

  supabase = {
    from(table) {
      return new MockBuilder(table, mockDb);
    }
  };

} else {
  supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// ── @supabase/server SDK Integration ──────────────────────────

const hasRealKeys = process.env.SUPABASE_URL && 
                    process.env.SUPABASE_PUBLISHABLE_KEY && 
                    process.env.SUPABASE_SECRET_KEY && 
                    process.env.SUPABASE_JWKS_URL;

let withSupabase;

if (hasRealKeys) {
  const serverSdk = require('@supabase/server');
  withSupabase = serverSdk.withSupabase;
} else {
  console.warn(
    '[Supabase] Missing SUPABASE_PUBLISHABLE_KEY or SUPABASE_JWKS_URL — Using mock withSupabase handler wrapper.'
  );
  withSupabase = function(options, handler) {
    return async (req, ctx = {}) => {
      ctx.supabase = supabase;
      ctx.supabaseAdmin = supabase;
      return handler(req, ctx);
    };
  };
}

function toExpress(webHandler) {
  return async (req, res, next) => {
    try {
      const protocol = req.protocol;
      const host = req.get('host');
      const url = `${protocol}://${host}${req.originalUrl}`;
      
      const headers = new Headers();
      for (const [key, val] of Object.entries(req.headers)) {
        if (val !== undefined) {
          if (Array.isArray(val)) {
            val.forEach(v => headers.append(key, v));
          } else {
            headers.set(key, val);
          }
        }
      }

      const init = {
        method: req.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body) {
        init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const webReq = new Request(url, init);
      
      const ctx = {
        params: req.params,
        query: req.query,
      };

      const webRes = await webHandler(webReq, ctx);

      res.status(webRes.status);
      webRes.headers.forEach((val, key) => res.set(key, val));
      
      const contentType = webRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await webRes.json();
        res.json(json);
      } else {
        const text = await webRes.text();
        res.send(text);
      }
    } catch (err) {
      next(err);
    }
  };
}

// Assign to supabase object for backward compatibility and destructuring
supabase.supabase = supabase;
supabase.withSupabase = withSupabase;
supabase.toExpress = toExpress;

module.exports = supabase;

