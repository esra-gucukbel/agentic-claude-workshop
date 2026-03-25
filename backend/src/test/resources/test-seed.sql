CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    full_name     VARCHAR(255) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tours (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    tour_number  CHAR(4) NOT NULL UNIQUE,
    vehicle_type VARCHAR(32) NOT NULL,
    max_volume   NUMERIC(8,2) NOT NULL,
    max_weight   NUMERIC(8,2) NOT NULL,
    range_km     INTEGER NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);

-- test / test
INSERT INTO users (email, full_name, password_hash)
VALUES ('test@vibeplanner.com', 'Test User', '$2b$10$oy5CxC3gII/QB0H8x36CGOXpRwYLjLDq.4vI9nzp6hCVNITjmcAH.')
ON CONFLICT (email) DO NOTHING;
