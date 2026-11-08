-- Migration: 20261107230000_user_auth_identities.sql
-- H031: Identidades de Autenticación Federada, Google OAuth y Cuentas Unificadas
-- Canario: DAOM-LEARNING-H031-COMPLETE

CREATE TABLE IF NOT EXISTS user_auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_learning_provider_subject UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_user_auth_identities_user_id ON user_auth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_identities_provider_subject ON user_auth_identities(provider, provider_subject);
CREATE INDEX IF NOT EXISTS idx_user_auth_identities_provider_email ON user_auth_identities(provider, provider_email);
