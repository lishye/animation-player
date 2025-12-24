
import React from 'react';

interface ControlPanelProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentFrame: number;
  totalFrames: number;
  onSeek: (index: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isPlaying,
  onTogglePlay,
  currentFrame,
  totalFrames,
  onSeek,
  speed,
  onSpeedChange,
  onAnalyze,
  isAnalyzing,
  onPrev,
  onNext
}) => {
  return (
    <div className="bg-slate-800 p-4 rounded-xl shadow-2xl border border-slate-700 flex flex-col gap-4 w-full max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-400 px-1">
          <span>Frame {currentFrame + 1}</span>
          <span>Total {totalFrames}</span>
        </div>
        <input
          type="range"
          min="0"
          max={totalFrames - 1}
          value={currentFrame}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Playback Controls */}
        <div className="flex items-center justify-center md:justify-start gap-4">
          <button
            onClick={onPrev}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300"
            title="Previous Frame"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          
          <button
            onClick={onTogglePlay}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-6 h-6 ml-1" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <button
            onClick={onNext}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300"
            title="Next Frame"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-400 w-12 text-right">{speed}x</span>
          <input
            type="range"
            min="0.1"
            max="4"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="flex-grow h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
          />
        </div>

        {/* AI Analysis Button */}
        <div className="flex justify-center md:justify-end">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors shadow-lg"
          >
            {isAnalyzing ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h2v8zm-4 0H8V11h2v6zm8 0h-2v-4h2v4z"/></svg>
            )}
            AI Describe
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
