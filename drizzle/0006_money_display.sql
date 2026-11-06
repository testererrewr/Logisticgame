ALTER TABLE users ADD COLUMN money_display TEXT NOT NULL DEFAULT 'full' CHECK(money_display IN ('full','compact'));
