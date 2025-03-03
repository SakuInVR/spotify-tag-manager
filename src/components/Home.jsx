import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home-container">
      <h2>Spotify Tag Manager</h2>
      <p>
        このアプリケーションでは、Spotifyで再生中の楽曲に自動的にタグを付けて管理することができます。
      </p>
      
      <div className="features">
        <div className="feature">
          <h3>自動タグ付け</h3>
          <p>再生中の曲に曲名、アーティスト名、アルバム名、日付が自動的にタグ付けされます。</p>
          <Link to="/now-playing" className="feature-link">今すぐ始める</Link>
        </div>
        
        <div className="feature">
          <h3>タグによる絞り込み</h3>
          <p>保存した曲をタグで絞り込んで検索できます。</p>
          <Link to="/tagged-tracks" className="feature-link">タグ付けした曲を見る</Link>
        </div>
        
        <div className="feature">
          <h3>プレイリスト作成</h3>
          <p>タグで絞り込んだ曲からSpotifyプレイリストを作成できます。</p>
          <Link to="/create-playlist" className="feature-link">プレイリストを作成</Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
