import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import SpotifyWebApi from 'spotify-web-api-js';
import './App.css';

// コンポーネントのインポート
import Home from './components/Home';
import NowPlaying from './components/NowPlaying';
import TaggedTracks from './components/TaggedTracks';
import PlaylistCreator from './components/PlaylistCreator';

// Supabaseクライアントの初期化
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Spotifyクライアントの初期化
const spotifyApi = new SpotifyWebApi();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [spotifyUserId, setSpotifyUserId] = useState(null);
  const [supabaseUserId, setSupabaseUserId] = useState(null);

  // Supabase認証を初期化（匿名認証なしバージョン）
  useEffect(() => {
    const initSupabaseAuth = async () => {
      try {
        // 既存のセッションを確認
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          setSupabaseUserId(session.user.id);
          localStorage.setItem('supabase_user_id', session.user.id);
        } else {
          // 匿名認証が無効の場合は、一時的なIDを生成して使用
          let tempId = localStorage.getItem('temp_user_id');
          if (!tempId) {
            tempId = 'temp_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('temp_user_id', tempId);
          }
          setSupabaseUserId(tempId);
        }
      } catch (error) {
        console.error('Supabase auth error:', error);
        // エラーが発生した場合も一時的なIDを使用
        let tempId = localStorage.getItem('temp_user_id');
        if (!tempId) {
          tempId = 'temp_' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('temp_user_id', tempId);
        }
        setSupabaseUserId(tempId);
      }
    };
    
    initSupabaseAuth();
  }, []);

  // Spotifyログイン処理
  const login = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = window.location.origin;
    const scope = 'user-read-currently-playing user-read-playback-state user-modify-playback-state playlist-modify-public playlist-modify-private';
    
    window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token`;
  };

  // ログアウト処理
  const logout = () => {
    // ローカルストレージからSpotify関連のデータを削除
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expiration');
    localStorage.removeItem('spotify_user_id');
    
    // 状態をリセット
    setIsLoggedIn(false);
    setSpotifyUserId(null);
    
    // ホームページにリダイレクト
    window.location.href = window.location.origin;
  };

  // トークンの取得と設定
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      try {
        const token = hash.substring(1).split('&').find(elem => elem.startsWith('access_token')).split('=')[1];
        const expiresIn = hash.substring(1).split('&').find(elem => elem.startsWith('expires_in')).split('=')[1];
        
        // トークンの有効期限をタイムスタンプとして保存
        const expirationTime = Date.now() + parseInt(expiresIn) * 1000;
        localStorage.setItem('spotify_token_expiration', expirationTime.toString());
        
        spotifyApi.setAccessToken(token);
        setIsLoggedIn(true);
        window.location.hash = '';
        
        // ユーザーIDを取得
        spotifyApi.getMe().then(user => {
          console.log('Logged in user:', user);
          setSpotifyUserId(user.id);
          localStorage.setItem('spotify_user_id', user.id);
          localStorage.setItem('spotify_access_token', token);
          
          // Spotifyユーザー情報をSupabaseに保存
          if (supabaseUserId) {
            supabase
              .from('spotify_users')
              .upsert([
                {
                  supabase_user_id: supabaseUserId,
                  spotify_user_id: user.id,
                  display_name: user.display_name,
                  email: user.email,
                  last_login: new Date().toISOString()
                }
              ])
              .then(({ error }) => {
                if (error) {
                  console.error('Error saving Spotify user info:', error);
                } else {
                  console.log('Successfully saved user info to Supabase');
                }
              });
          }
        }).catch(error => {
          console.error('Error getting user profile:', error);
          // トークンが無効な場合は再認証
          localStorage.removeItem('spotify_access_token');
          localStorage.removeItem('spotify_token_expiration');
          localStorage.removeItem('spotify_user_id');
          setIsLoggedIn(false);
          alert('Spotifyの認証に失敗しました。再度ログインしてください。');
        });
      } catch (error) {
        console.error('Error parsing hash parameters:', error);
        alert('認証情報の解析に失敗しました。再度ログインしてください。');
      }
    } else {
      // ローカルストレージからトークンを復元
      const token = localStorage.getItem('spotify_access_token');
      const storedSpotifyUserId = localStorage.getItem('spotify_user_id');
      const tokenExpiration = localStorage.getItem('spotify_token_expiration');
      
      if (token) {
        // トークンの有効期限をチェック
        if (tokenExpiration && parseInt(tokenExpiration) > Date.now()) {
          spotifyApi.setAccessToken(token);
          setIsLoggedIn(true);
          setSpotifyUserId(storedSpotifyUserId);
          
          // トークンの有効性を確認
          spotifyApi.getMe().then(user => {
            console.log('Validated user:', user);
            // ユーザー情報が一致するか確認
            if (user.id !== storedSpotifyUserId) {
              console.warn('User ID mismatch, updating stored ID');
              setSpotifyUserId(user.id);
              localStorage.setItem('spotify_user_id', user.id);
            }
          }).catch(error => {
            console.error('Error validating token:', error);
            // トークンが無効な場合は再認証
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_token_expiration');
            localStorage.removeItem('spotify_user_id');
            setIsLoggedIn(false);
            alert('セッションの有効期限が切れました。再度ログインしてください。');
          });
        } else {
          // トークンの有効期限が切れている場合は再認証
          console.log('Token expired, please login again');
          localStorage.removeItem('spotify_access_token');
          localStorage.removeItem('spotify_token_expiration');
          localStorage.removeItem('spotify_user_id');
          setIsLoggedIn(false);
          // 自動的に再ログインを促さない（ユーザーが意図的にログアウトした可能性もあるため）
        }
      }
    }
  }, [supabaseUserId]);

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Spotify Tag Manager</h1>
          {!isLoggedIn ? (
            <button onClick={login} className="login-button">Login with Spotify</button>
          ) : (
            <nav>
              <ul className="nav-links">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/tagged-tracks">Tagged Tracks</Link></li>
                <li><Link to="/create-playlist">Create Playlist</Link></li>
                <li><button onClick={logout} className="logout-button">ログアウト</button></li>
              </ul>
            </nav>
          )}
        </header>

        <div className="app-container">
          {isLoggedIn && (
            <aside className="sidebar">
              <NowPlaying 
                spotifyApi={spotifyApi} 
                supabase={supabase} 
                spotifyUserId={spotifyUserId}
                supabaseUserId={supabaseUserId}
                isSidebar={true}
              />
            </aside>
          )}

          <main>
            {isLoggedIn ? (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route 
                  path="/now-playing" 
                  element={<NowPlaying 
                    spotifyApi={spotifyApi} 
                    supabase={supabase} 
                    spotifyUserId={spotifyUserId}
                    supabaseUserId={supabaseUserId}
                    isSidebar={false}
                  />} 
                />
                <Route 
                  path="/tagged-tracks" 
                  element={<TaggedTracks 
                    spotifyApi={spotifyApi}
                    supabase={supabase} 
                    spotifyUserId={spotifyUserId}
                    supabaseUserId={supabaseUserId}
                    isLoggedIn={isLoggedIn}
                  />} 
                />
                <Route 
                  path="/create-playlist" 
                  element={<PlaylistCreator 
                    spotifyApi={spotifyApi} 
                    supabase={supabase} 
                    spotifyUserId={spotifyUserId}
                    supabaseUserId={supabaseUserId}
                    isLoggedIn={isLoggedIn}
                  />} 
                />
              </Routes>
            ) : (
              <div className="welcome-message">
                <h2>Welcome to Spotify Tag Manager</h2>
                <p>Log in with your Spotify account to start tagging your music.</p>
                <div className="auth-instructions">
                  <p>このアプリを使用するには、以下の手順に従ってください：</p>
                  <ol>
                    <li>「Login with Spotify」ボタンをクリックしてSpotifyアカウントでログインします</li>
                    <li>アプリへのアクセス許可を承認します</li>
                    <li>ログイン後、Spotifyで曲を再生すると、タグ付けができるようになります</li>
                    <li>Spotify Premiumアカウントをお持ちの場合は、アプリ内から直接曲を再生できます</li>
                  </ol>
                </div>
                <div className="development-notice">
                  <h2>⚠️ 開発中のお知らせ ⚠️</h2>
                  <p>このサービスは現在開発中のベータ版です。予告なく機能の変更や運用の停止が行われる可能性があります。</p>
                  <div className="account-instructions">
                    <h3>サービスの利用方法</h3>
                    <p>以下の情報を管理者に送信してください：</p>
                    <ul>
                      <li>Spotifyアカウント名</li>
                      <li>Spotifyアカウントのメールアドレス</li>
                    </ul>
                    <p>管理者の確認後、サービスをご利用いただけます。</p>
                    <a 
                      href="https://forms.gle/oucFCJaaxi87pDcb6" 
                      className="contact-link" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      管理者に連絡する (Googleフォーム)
                    </a>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
