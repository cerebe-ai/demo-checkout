CREATE TABLE orders (
    id TEXT,
    user_id TEXT,
    email TEXT,
    shipping_address TEXT,
    total NUMERIC,
    currency TEXT,
    created_at TEXT
);

ALTER TABLE orders DROP COLUMN shipping_address;

ALTER TABLE orders RENAME COLUMN total TO amount;
