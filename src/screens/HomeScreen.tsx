import { useState } from 'react';
import { STAGES, stageProgress } from '../stages';
import { loadRecords } from '../storage';

interface HomeScreenProps {
  onShowStages: () => void;
  onShowFree: () => void;
  onShowHistory: () => void;
  onShowAnalysis: () => void;
}

export function HomeScreen({ onShowStages, onShowFree, onShowHistory, onShowAnalysis }: HomeScreenProps) {
  const [clearedCount] = useState(() => stageProgress(loadRecords()).size);

  return (
    <main className="screen home">
      <header className="top-bar">
        <h1 className="app-title">
          <span className="app-title-mark" aria-hidden="true">
            ×
          </span>
          くくれんしゅう
        </h1>
        <div className="top-bar-actions">
          <button type="button" className="btn btn-ghost btn-small" onClick={onShowAnalysis}>
            ぶんせき
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={onShowHistory}>
            きろく
          </button>
        </div>
      </header>

      <p className="home-lead">どっちで れんしゅうする？</p>

      <div className="home-menu">
        <button type="button" className="mode-card mode-card-stage" onClick={onShowStages}>
          <span className="mode-card-icon" aria-hidden="true">
            🏆
          </span>
          <span className="mode-card-main">
            <strong>ステップれんしゅう</strong>
            <span>1つの だんから じゅんに クリアしていこう</span>
          </span>
          <span className="mode-card-count" aria-label={`クリア ${clearedCount} / ${STAGES.length}`}>
            ⭐ {clearedCount}/{STAGES.length}
          </span>
        </button>

        <button type="button" className="mode-card mode-card-free" onClick={onShowFree}>
          <span className="mode-card-icon" aria-hidden="true">
            ✏️
          </span>
          <span className="mode-card-main">
            <strong>じゆうれんしゅう</strong>
            <span>だん・もんだいの かず・じゅんばんを じぶんで えらぼう</span>
          </span>
        </button>
      </div>
    </main>
  );
}
