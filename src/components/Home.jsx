import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Spotify Tag Manager</h1>
        <p className="home-description">
          Spotifyで再生中の楽曲にタグを付けて、効率的に音楽を管理しましょう
        </p>
      </div>
      
      <div className="features">
        <div className="feature">
          <div className="feature-icon">🎵</div>
          <h3>タグ付け</h3>
          <p>再生中の曲に好きなタグを付けて整理できます。曲名、アーティスト名、アルバム名、日付は自動的にタグ付けされます。</p>
          <Link to="/now-playing" className="feature-link">再生中の曲を見る</Link>
        </div>
        
        <div className="feature">
          <div className="feature-icon">🔍</div>
          <h3>タグによる絞り込み</h3>
          <p>保存した曲をタグで絞り込んで検索できます。複数のタグを組み合わせて、より詳細な検索も可能です。</p>
          <Link to="/tagged-tracks" className="feature-link">タグ付けした曲を見る</Link>
        </div>
        
        <div className="feature">
          <div className="feature-icon">📋</div>
          <h3>プレイリスト作成</h3>
          <p>タグで絞り込んだ曲からSpotifyプレイリストを作成できます。お気に入りのタグを組み合わせて、あなただけのプレイリストを作りましょう。</p>
          <Link to="/create-playlist" className="feature-link">プレイリストを作成</Link>
        </div>
      </div>
      
      <div className="home-footer">
        <p>Spotifyアカウントでログインして、すべての機能をお楽しみください</p>
      </div>
    </div>
  );
}

export default Home;
