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

  // トークンの取得と設定
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const token = hash.substring(1).split('&').find(elem => elem.startsWith('access_token')).split('=')[1];
      spotifyApi.setAccessToken(token);
      setIsLoggedIn(true);
      window.location.hash = '';
      
      // ユーザーIDを取得
      spotifyApi.getMe().then(user => {
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
              if (error) console.error('Error saving Spotify user info:', error);
            });
        }
      });
    } else {
      // ローカルストレージからトークンを復元
      const token = localStorage.getItem('spotify_access_token');
      const storedSpotifyUserId = localStorage.getItem('spotify_user_id');
      
      if (token) {
        spotifyApi.setAccessToken(token);
        setIsLoggedIn(true);
        setSpotifyUserId(storedSpotifyUserId);
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
                  path="/tagged-tracks" 
                  element={<TaggedTracks 
                    spotifyApi={spotifyApi}
                    supabase={supabase} 
                    spotifyUserId={spotifyUserId}
                    supabaseUserId={supabaseUserId} 
                  />} 
                />
                <Route 
                  path="/create-playlist" 
                  element={<PlaylistCreator 
                    spotifyApi={spotifyApi} 
                    supabase={supabase} 
                    spotifyUserId={spotifyUserId}
                    supabaseUserId={supabaseUserId} 
                  />} 
                />
              </Routes>
            ) : (
              <div className="welcome-message">
                <h2>Welcome to Spotify Tag Manager</h2>
                <p>Log in with your Spotify account to start tagging your music.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
