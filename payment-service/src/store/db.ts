import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { config } from "../config";

const resolvedPath = path.resolve(config.dbPath);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    order_no TEXT PRIMARY KEY,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    channel TEXT NOT NULL,
    provider_trade_no TEXT,
    client_ip TEXT NOT NULL,
    created_at TEXT NOT NULL,
    paid_at TEXT
  )
`);

export default db;
