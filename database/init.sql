-- Production database
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (email, password_hash)
VALUES ('test@vibeplanner.com', '$2b$10$oy5CxC3gII/QB0H8x36CGOXpRwYLjLDq.4vI9nzp6hCVNITjmcAH.')
ON CONFLICT (email) DO NOTHING;

-- Test database (used by E2E tests — kept separate so test runs never touch dev data)
CREATE DATABASE vibeplanner_tests;

\connect vibeplanner_tests

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (email, password_hash)
VALUES ('test@vibeplanner.com', '$2b$10$oy5CxC3gII/QB0H8x36CGOXpRwYLjLDq.4vI9nzp6hCVNITjmcAH.')
ON CONFLICT (email) DO NOTHING;
