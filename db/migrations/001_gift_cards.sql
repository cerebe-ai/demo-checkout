CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT
);

CREATE TABLE gift_cards (
  code TEXT PRIMARY KEY,
  balance NUMERIC,
  user_id TEXT
);
