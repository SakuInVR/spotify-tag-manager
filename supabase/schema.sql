-- Spotifyユーザー情報を保存するテーブル
CREATE TABLE IF NOT EXISTS spotify_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id TEXT NOT NULL,
  spotify_user_id TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_supabase_user UNIQUE (supabase_user_id),
  CONSTRAINT unique_spotify_user UNIQUE (spotify_user_id)
);

-- タグ付けされた曲を保存するテーブル
CREATE TABLE IF NOT EXISTS tagged_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  spotify_user_id TEXT,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT NOT NULL,
  album_image TEXT,
  tag TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同じユーザーが同じ曲に同じタグを複数回追加できないようにする
  CONSTRAINT unique_user_track_tag UNIQUE (user_id, track_id, tag)
);

-- ユーザーIDとトラックIDでインデックスを作成
CREATE INDEX IF NOT EXISTS idx_tagged_tracks_user_id ON tagged_tracks (user_id);
CREATE INDEX IF NOT EXISTS idx_tagged_tracks_spotify_user_id ON tagged_tracks (spotify_user_id);
CREATE INDEX IF NOT EXISTS idx_tagged_tracks_track_id ON tagged_tracks (track_id);
CREATE INDEX IF NOT EXISTS idx_tagged_tracks_tag ON tagged_tracks (tag);

-- RLSポリシーを設定（各ユーザーは自分のデータのみアクセス可能）
ALTER TABLE tagged_tracks ENABLE ROW LEVEL SECURITY;

-- 開発環境ではRLSを無効にする（本番環境では有効にすることを推奨）
-- 以下のコメントを解除すると、RLSが有効になります

/*
CREATE POLICY "ユーザーは自分のタグ付けした曲のみ参照可能" 
  ON tagged_tracks FOR SELECT 
  USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "ユーザーは自分の曲にのみタグ付け可能" 
  ON tagged_tracks FOR INSERT 
  WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "ユーザーは自分のタグのみ削除可能" 
  ON tagged_tracks FOR DELETE 
  USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Spotifyユーザーテーブルのポリシー
ALTER TABLE spotify_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは自分のSpotify情報のみ参照可能" 
  ON spotify_users FOR SELECT 
  USING (supabase_user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "ユーザーは自分のSpotify情報のみ更新可能" 
  ON spotify_users FOR INSERT 
  WITH CHECK (supabase_user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "ユーザーは自分のSpotify情報のみ更新可能" 
  ON spotify_users FOR UPDATE 
  USING (supabase_user_id = current_setting('request.jwt.claims')::json->>'sub');
*/
