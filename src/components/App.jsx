function App() {
  // ...existing code...

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
                <li><Link to="/now-playing">Now Playing</Link></li>
                <li><Link to="/tagged-tracks">Tagged Tracks</Link></li>
                <li><Link to="/create-playlist">Create Playlist</Link></li>
                <li><button onClick={logout} className="logout-button">ログアウト</button></li>
              </ul>
            </nav>
          )}
        </header>

        <div className="app-container">
          {isLoggedIn && (
            <div className="sidebar">
              <NowPlaying 
                spotifyApi={spotifyApi} 
                supabase={supabase} 
                spotifyUserId={spotifyUserId}
                supabaseUserId={supabaseUserId}
                isSidebar={true}
              />
            </div>
          )}

          <main className={isLoggedIn ? 'with-sidebar' : ''}>
            {authError ? (
              <div className="auth-error">
                <p>{authError}</p>
                <button 
                  className="reauth-button"
                  onClick={() => {
                    localStorage.removeItem('spotify_access_token');
                    window.location.reload();
                  }}
                >
                  再認証する
                </button>
              </div>
            ) : isLoggedIn ? (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route 
                  path="/now-playing" 
                  element={
                    <NowPlaying 
                      spotifyApi={spotifyApi} 
                      supabase={supabase} 
                      spotifyUserId={spotifyUserId}
                      supabaseUserId={supabaseUserId}
                      isSidebar={false}
                    />
                  } 
                />
                <Route 
                  path="/tagged-tracks" 
                  element={
                    <TaggedTracks 
                      spotifyApi={spotifyApi}
                      supabase={supabase} 
                      spotifyUserId={spotifyUserId}
                      supabaseUserId={supabaseUserId}
                      isLoggedIn={isLoggedIn}
                    />
                  } 
                />
                <Route 
                  path="/create-playlist" 
                  element={
                    <PlaylistCreator 
                      spotifyApi={spotifyApi} 
                      supabase={supabase} 
                      spotifyUserId={spotifyUserId}
                      supabaseUserId={supabaseUserId}
                      isLoggedIn={isLoggedIn}
                    />
                  } 
                />
              </Routes>
            ) : (
              // ...existing code...
            )}
          </main>
        </div>
      </div>
    </Router>
  );
}