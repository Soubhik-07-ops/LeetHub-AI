-- Migration 010: AI Developer Coach Tables

-- AI Analyses Table
CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    analysis_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id ON ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_submission_id ON ai_analyses(submission_id);

ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_ai_analyses ON ai_analyses 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_ai_analyses ON ai_analyses 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);


-- AI Conversations Table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_ai_conversations ON ai_conversations 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_ai_conversations ON ai_conversations 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_ai_conversations ON ai_conversations 
    FOR UPDATE 
    USING (auth.uid() = user_id);


-- AI Messages Table
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- We verify message ownership through the conversation_id foreign key
CREATE POLICY select_own_ai_messages ON ai_messages 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM ai_conversations c 
            WHERE c.id = ai_messages.conversation_id 
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY insert_own_ai_messages ON ai_messages 
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_conversations c 
            WHERE c.id = ai_messages.conversation_id 
            AND c.user_id = auth.uid()
        )
    );
