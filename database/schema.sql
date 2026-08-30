-- =============================================================================
-- RBAC SYSTEM — PostgreSQL Database Schema
-- =============================================================================
--
-- EDUCATIONAL OVERVIEW
-- --------------------
-- This schema implements the classic RBAC (Role-Based Access Control) data
-- model with THREE core entities:
--
--   1. users      —  every authenticated person has exactly ONE role
--   2. roles      —  groups of permissions (e.g. "Admin", "Editor", "Viewer")
--   3. permissions —  fine-grained capabilities (e.g. "create_content")
--
-- A FOURTH table, `role_permissions`, is a many-to-many bridge that links
-- roles to the permissions they grant.  This design lets you add new roles
-- or change a role's permissions without touching any user records.
--
-- Relationship summary (all lowercase = table / column names):
--
--   users.role_id      →  roles.id            (many users → one role)
--   role_permissions.role_id     →  roles.id
--   role_permissions.permission_id → permissions.id    (many-to-many)
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. roles
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,              -- machine name, e.g. "admin"
    description TEXT         NOT NULL,                     -- human-readable label
    created_at  TIMESTAMP    DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. permissions
-- -----------------------------------------------------------------------------
CREATE TABLE permissions (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,              -- machine name, e.g. "manage_users"
    description TEXT         NOT NULL,                     -- human-readable label
    created_at  TIMESTAMP    DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. role_permissions  (junction / bridge table for the many-to-many M:N)
-- -----------------------------------------------------------------------------
-- Each row says:  "this role is granted this permission."
-- A single role can have MANY permissions, and a single permission can be
-- shared by MANY roles.  Example: "view_reports" might belong to both Admin
-- and Viewer.
CREATE TABLE role_permissions (
    role_id       INTEGER NOT NULL REFERENCES roles (id)        ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions (id)  ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- -----------------------------------------------------------------------------
-- 4. users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50)    NOT NULL UNIQUE,
    email           VARCHAR(100)   NOT NULL UNIQUE,
    password_hash   VARCHAR(255)   NOT NULL,                    -- bcrypt hash
    role_id         INTEGER        NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    is_active       BOOLEAN        DEFAULT TRUE,
    created_at      TIMESTAMP      DEFAULT NOW(),
    updated_at      TIMESTAMP      DEFAULT NOW()
);

-- Index to speed up JWT-based lookups by email during login.
CREATE INDEX idx_users_email ON users (email);
