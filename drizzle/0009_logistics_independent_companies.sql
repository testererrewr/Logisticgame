-- Separate freight companies, each with its own capital, routes, vehicles and buildings.
-- 0008's experimental shared-coop tables are deliberately left unused.
CREATE TABLE IF NOT EXISTS logistics_company_worlds (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  last_action TEXT,
  updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS logistics_cooperation_offers (
  id TEXT PRIMARY KEY NOT NULL,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  good TEXT NOT NULL,
  quantity REAL NOT NULL CHECK(quantity>0 AND quantity<=10000),
  price INTEGER NOT NULL CHECK(price>=0 AND price<=2000000000),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','accepted','rejected','withdrawn')),
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL,
  settled INTEGER,
  CHECK(sender_id<>receiver_id)
);
CREATE INDEX IF NOT EXISTS logistics_cooperation_received ON logistics_cooperation_offers(receiver_id,status,created);
CREATE INDEX IF NOT EXISTS logistics_cooperation_sent ON logistics_cooperation_offers(sender_id,status,created);
CREATE TABLE IF NOT EXISTS logistics_track_permissions (
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grantee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  updated INTEGER NOT NULL,
  PRIMARY KEY(owner_id,grantee_id),
  CHECK(owner_id<>grantee_id)
);
-- Insert a guard at the beginning of a D1 batch. If the expected revisions
-- or offer status have changed, CHECK aborts and rolls back the entire batch.
CREATE TABLE IF NOT EXISTS logistics_trade_guards (
  id TEXT PRIMARY KEY NOT NULL,
  valid INTEGER NOT NULL CHECK(valid=1)
);
