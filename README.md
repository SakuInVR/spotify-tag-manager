# Spotify Tag Manager

Spotifyで再生中の楽曲に自動的にタグを付けて管理し、タグによる絞り込みでプレイリストを作成できるWebアプリケーションです。

## 機能

- **Spotify連携**: Spotifyアカウントでログインして、現在再生中の曲の情報を取得します。
- **自動タグ付け**: 再生中の曲に曲名、アーティスト名、アルバム名、日付が自動的にタグ付けされます。
- **カスタムタグ**: ユーザーが自由にカスタムタグを追加できます。
- **タグによる絞り込み**: 保存した曲をタグで絞り込んで検索できます。
- **プレイリスト作成**: タグで絞り込んだ曲からSpotifyプレイリストを作成できます。

## セットアップ手順

### 前提条件

- Node.js (v14以上)
- npm または yarn
- Spotifyアカウント
- Supabaseアカウント

### 1. Spotify Developer Dashboardでアプリを登録

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/) にアクセスしてログイン
2. 「Create an App」をクリックして新しいアプリを作成
3. アプリ名と説明を入力
4. リダイレクトURIに `http://localhost:5173` を追加
5. Client IDとClient Secretをメモ

### 2. Supabaseプロジェクトのセットアップ

1. [Supabase](https://supabase.com/) にアクセスしてアカウント作成
2. 新しいプロジェクトを作成
3. SQLエディタを開き、`supabase/schema.sql` の内容を実行
4. プロジェクトのURLと匿名キーをメモ

### 3. 環境変数の設定

`.env` ファイルを編集して、以下の情報を入力:

```
VITE_SPOTIFY_CLIENT_ID=あなたのSpotify Client ID
VITE_SPOTIFY_CLIENT_SECRET=あなたのSpotify Client Secret
VITE_SUPABASE_URL=あなたのSupabase URL
VITE_SUPABASE_ANON_KEY=あなたのSupabase匿名キー
```

### 4. アプリケーションのインストールと実行

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてアプリケーションを使用できます。

## 使用方法

1. トップページからSpotifyアカウントでログイン
2. 「Now Playing」ページでSpotifyで曲を再生すると、自動的にタグが追加されます
3. カスタムタグを追加することもできます
4. 「Tagged Tracks」ページで保存した曲を確認し、タグで絞り込みができます
5. 「Create Playlist」ページでタグで絞り込んだ曲からプレイリストを作成できます

## 技術スタック

- **フロントエンド**: React, React Router
- **スタイリング**: CSS
- **API**: Spotify Web API
- **データベース**: Supabase (PostgreSQL)
- **ビルドツール**: Vite

## セキュリティ対策

### Row Level Security (RLS)

このアプリケーションはSupabaseのRow Level Security (RLS)を使用して、ユーザーが自分のデータのみにアクセスできるようにしています。

- 開発/テスト環境: RLSを無効にして簡単にテストできます（Supabaseダッシュボードの「Table Editor」→「tagged_tracks」テーブル→「Policies」タブ→「Enable RLS」をオフ）
- 本番環境: RLSを有効にして、各ユーザーが自分のデータのみにアクセスできるようにします

### 認証システム

アプリケーションは以下の認証システムを実装しています：

1. **一時的なユーザーID**: ユーザーがアプリにアクセスすると、ブラウザのローカルストレージに一時的なIDを生成して保存
2. **Spotify OAuth**: Spotifyアカウントでログインすると、SpotifyユーザーIDを取得
3. **ID連携**: 一時的なIDとSpotifyユーザーIDを紐付けて保存

この仕組みにより、Supabaseの匿名認証が無効でも正常に動作します。本番環境では、より堅牢な認証システムの実装を検討してください。

## 注意事項

- Spotify APIのトークンは有効期限があります。長時間使用する場合は、リフレッシュトークンの実装が必要です。
- 本番環境では、より堅牢な認証システム（メール/パスワード認証やソーシャルログインなど）の実装を検討してください。
