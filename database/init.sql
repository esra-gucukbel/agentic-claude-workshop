-- Production database
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    full_name     VARCHAR(255) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tours (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tour_waypoints (
    id          SERIAL PRIMARY KEY,
    tour_id     INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0
);

INSERT INTO users (email, full_name, password_hash)
VALUES ('test@vibeplanner.com', 'Test User', '$2b$10$oy5CxC3gII/QB0H8x36CGOXpRwYLjLDq.4vI9nzp6hCVNITjmcAH.')
ON CONFLICT (email) DO NOTHING;

-- Test database (used by E2E tests — kept separate so test runs never touch dev data)
CREATE DATABASE vibeplanner_tests;

\connect vibeplanner_tests

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    full_name     VARCHAR(255) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tours (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tour_waypoints (
    id          SERIAL PRIMARY KEY,
    tour_id     INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0
);

INSERT INTO users (email, full_name, password_hash)
VALUES ('test@vibeplanner.com', 'Test User', '$2b$10$oy5CxC3gII/QB0H8x36CGOXpRwYLjLDq.4vI9nzp6hCVNITjmcAH.')
ON CONFLICT (email) DO NOTHING;
