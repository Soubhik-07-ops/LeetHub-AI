-- Migration 002: User Integrations

-- Extension Connections
CREATE TABLE IF NOT EXISTS extension_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT UNIQUE NOT NULL,
    credential_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ext_conn_user_id ON extension_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_ext_conn_device_id ON extension_connections(device_id);

-- Extension Pairing Codes
CREATE TABLE IF NOT EXISTS extension_pairing_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_pairing_user_id ON extension_pairing_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_ext_pairing_code_hash ON extension_pairing_codes(code_hash);

-- GitHub Connections
CREATE TABLE IF NOT EXISTS github_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    github_user_id TEXT,
    github_username TEXT,
    installation_id TEXT,
    repository_owner TEXT,
    repository_name TEXT,
    default_branch TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_conn_user_id ON github_connections(user_id);

-- RLS Policies
ALTER TABLE extension_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_ext_connections ON extension_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY delete_own_ext_connections ON extension_connections FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_github_connections ON github_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_github_connections ON github_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_github_connections ON github_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY delete_own_github_connections ON github_connections FOR DELETE USING (auth.uid() = user_id);
