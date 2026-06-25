-- ═══════════════════════════════════════════════════════════════
-- GameCont — Friends Table Schema
-- ═══════════════════════════════════════════════════════════════
-- This migration creates the friendships table to store friend
-- requests and accepted friendships.

CREATE TABLE IF NOT EXISTS friendships (
    id              VARCHAR(36)  PRIMARY KEY,
    user_id         VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id       VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20)  NOT NULL, -- 'PENDING', 'ACCEPTED'
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_friend UNIQUE (user_id, friend_id),
    CONSTRAINT no_self_friendship CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendship_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendship_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendship_status ON friendships(status);
