# Spotify Tag Manager

<div align="center">
  <img src="screenshots/logo.png" alt="Spotify Tag Manager Logo" width="200"/>
</div>

Spotifyで再生中の楽曲に自動的にタグを付けて管理し、タグによる絞り込みでプレイリストを作成できるWebアプリケーションです。お気に入りの曲を自分だけのタグで整理して、新しい音楽体験を楽しみましょう。

## 機能

- **Spotify連携**: Spotifyアカウントでログインして、現在再生中の曲の情報を取得します。
- **自動タグ付け**: 再生中の曲に曲名、アーティスト名、アルバム名、日付が自動的にタグ付けされます。
- **カスタムタグ**: ユーザーが自由にカスタムタグを追加できます。
- **タグの付け外し**: 追加したタグを簡単に削除できます。
- **タグによる絞り込み**: 保存した曲をタグで絞り込んで検索できます。
- **タグ検索機能**: 多数のタグから特定のタグを素早く検索できます。
- **シンプル表示モード**: コンパクトなレイアウトで多くの曲を一度に表示できます。
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
3. カスタムタグを追加したり、不要なタグを削除したりできます
4. 「Tagged Tracks」ページで保存した曲を確認し、タグで絞り込みができます
   - シンプル表示モードに切り替えると、より多くの曲を一度に表示できます
   - タグ検索機能を使って、多数のタグから特定のタグを素早く見つけられます
5. 「Create Playlist」ページでタグで絞り込んだ曲からプレイリストを作成できます

### スクリーンショット

<div align="center">
  <img src="screenshots/now-playing.png" alt="Now Playing画面" width="400"/>
  <p>Now Playing画面 - 再生中の曲にタグを付けられます</p>
  
  <img src="screenshots/tagged-tracks.png" alt="Tagged Tracks画面" width="400"/>
  <p>Tagged Tracks画面 - タグ付けした曲を管理できます</p>
  
  <img src="screenshots/playlist-creator.png" alt="Playlist Creator画面" width="400"/>
  <p>Playlist Creator画面 - タグで絞り込んでプレイリストを作成できます</p>
</div>

## 技術スタック

- **フロントエンド**: React 18, React Router 6
- **状態管理**: React Hooks
- **スタイリング**: CSS (カスタムプロパティを活用)
- **API**: Spotify Web API
- **データベース**: Supabase (PostgreSQL)
- **ビルドツール**: Vite
- **デプロイ**: Vercel (オプション)

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

## 最近の更新

- **タグの付け外し機能**: タグの横に削除ボタン（×）を追加し、不要なタグを簡単に削除できるようになりました
- **シンプル表示モードの改善**: コンパクトなレイアウトで多くの曲を一度に表示できるようになりました
- **タグ検索機能**: 多数のタグから特定のタグを素早く検索できる機能を追加しました
- **認証フローの改善**: トークンの有効期限を確認し、期限切れの場合は自動的に再認証を促すようになりました
- **エラーハンドリングの強化**: 様々なエラー状態に対応するメッセージを追加し、ユーザーに分かりやすい指示を提供するようになりました

## 他のユーザーアカウントでの利用について

このアプリケーションは、開発者のSpotify Developer Dashboardで作成したクライアントIDを使用していますが、各ユーザーは自分のSpotifyアカウントでログインして使用できます。ただし、以下の点に注意が必要です：

- **開発モードの制限**: Spotifyの開発モードでは、最大25人のユーザーしかアクセスできません
- **本格的な公開**: より多くのユーザーにアクセスを許可するには、Spotify Developer Dashboardでアプリケーションの公開申請を行う必要があります

## 注意事項

- Spotify APIのトークンは有効期限があります。アプリケーションは自動的にトークンの有効期限を確認し、期限切れの場合は再認証を促します。
- 本番環境では、より堅牢な認証システム（メール/パスワード認証やソーシャルログインなど）の実装を検討してください。
- Spotify Premiumアカウントをお持ちの場合は、アプリ内から直接曲を再生できます。無料アカウントの場合は、Spotifyアプリで曲を再生する必要があります。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## 貢献

バグ報告や機能リクエストは、GitHubのIssueで受け付けています。プルリクエストも歓迎します！
