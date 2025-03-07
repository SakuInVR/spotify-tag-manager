import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home-container">
      <div className="spotify-web-guide">
        <h2 id="whiten">👋 はじめに：音楽を再生しよう！</h2>
        <div className="guide-main">
          <p className="guide-intro" id="whiten">
            このアプリを使うには
            <a href="https://open.spotify.com/" 
               target="_blank" 
               rel="noopener noreferrer"
               className="spotify-link"
            >
              Spotify Web Player
            </a>
            で音楽を再生する必要があります。<br /><br />
          </p>
        </div>

        <div className="guide-steps">
          <h3>📝 使い方</h3>
          <ol>
            <li>
              <span className="step-number">1.</span>
              <a href="https://open.spotify.com/" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="spotify-link"
              >
                Spotify Web Player
              </a>
              を新しいタブで開く
            </li>
            <li>
              <span className="step-number">2.</span>
              好きな曲やプレイリストを再生する
            </li>
            <li>
              <span className="step-number">3.</span>
              このアプリに戻ってきて、再生中の曲にタグを付ける<br /><br />
            </li>
          </ol>
        </div>

        <div className="guide-tips">
          <h3>💡 おすすめの使い方</h3>
          <ul>
            <li>ブラウザの画面を分割して、Spotifyとこのアプリを同時に表示させると便利です</li>
            <li>お気に入りの曲を再生しながら、ジャンルや気分に合わせてタグを付けていきましょう</li>
            <li>タグ付けした曲は後からプレイリストにまとめることができます</li>
          </ul>
        </div>
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
