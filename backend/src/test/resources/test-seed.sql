CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- test / test
INSERT INTO users (username, password_hash)
VALUES ('test', '$2b$10$oy5CxC3gII/QB0H8x36CGOXpRwYLjLDq.4vI9nzp6hCVNITjmcAH.')
ON CONFLICT (username) DO NOTHING;
