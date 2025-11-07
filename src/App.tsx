import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioProcessor, BeatDetectionResult } from './utils/audioProcessor';
import { BeatCounter as BeatCounterUtil, BeatCounterState } from './utils/beatCounter';
import { HapticFeedback } from './utils/hapticFeedback';
import { BeatCounter } from './components/BeatCounter';
import { BPMDisplay } from './components/BPMDisplay';
import './App.css';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [isDownbeat, setIsDownbeat] = useState(false);
  const [isDashBeat, setIsDashBeat] = useState(false);
  const [bpm, setBPM] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [noMusicDetected, setNoMusicDetected] = useState(false);

  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const beatCounterRef = useRef<BeatCounterUtil>(new BeatCounterUtil());
  const hapticFeedbackRef = useRef<HapticFeedback>(new HapticFeedback());
  const lastBeatTimeRef = useRef<number>(0);
  const noMusicTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasDetectedBeatRef = useRef<boolean>(false);
  const musicStoppedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const NO_MUSIC_TIMEOUT = 2000; // 2 seconds without beats = music stopped

  const handleBeat = useCallback((result: BeatDetectionResult) => {
    const now = performance.now();
    
    // Prevent duplicate beats too close together
    if (now - lastBeatTimeRef.current < 100) {
      return;
    }
    lastBeatTimeRef.current = now;

    // Clear no music warning when beats are detected
    hasDetectedBeatRef.current = true;
    setNoMusicDetected(false);
    if (noMusicTimerRef.current) {
      clearTimeout(noMusicTimerRef.current);
      noMusicTimerRef.current = null;
    }
    if (musicStoppedTimerRef.current) {
      clearTimeout(musicStoppedTimerRef.current);
      musicStoppedTimerRef.current = null;
    }
    
    // Set timer to check if music stops (no beats for a while)
    musicStoppedTimerRef.current = setTimeout(() => {
      setNoMusicDetected(true);
      // Reset beat counter when music stops
      setCurrentBeat(0);
      setCycle(0);
      setIsDownbeat(false);
      setIsDashBeat(false);
      setBPM(0);
    }, NO_MUSIC_TIMEOUT);

    // Update beat counter
    const counterState = beatCounterRef.current.updateBeat(result.downbeat, result.timestamp);
    
    // Update UI for all beats (including dash beats 4 and 8)
    setCurrentBeat(counterState.currentBeat);
    setCycle(counterState.cycle);
    setIsDownbeat(counterState.isDownbeat);
    setIsDashBeat(counterState.isDashBeat);

    // Haptic feedback (skip for dash beats)
    if (hapticEnabled && hapticFeedbackRef.current.isAvailable() && !counterState.isDashBeat) {
      if (counterState.isDownbeat) {
        hapticFeedbackRef.current.downbeat();
      } else {
        hapticFeedbackRef.current.beat();
      }
    }
  }, [hapticEnabled]);

  const handleBPMUpdate = useCallback((newBPM: number) => {
    setBPM(newBPM);
  }, []);

  const startListening = async () => {
    try {
      setError(null);
      const processor = new AudioProcessor({
        onBeat: handleBeat,
        onBPMUpdate: handleBPMUpdate,
      });
      
      await processor.start();
      audioProcessorRef.current = processor;
      setIsListening(true);
      beatCounterRef.current.reset();
      setCurrentBeat(0);
      setCycle(0);
      setIsDownbeat(false);
      setIsDashBeat(false);
      setBPM(0);
      setNoMusicDetected(false);
      hasDetectedBeatRef.current = false;
      
      // Set timer to check if no beats are detected after 5 seconds
      noMusicTimerRef.current = setTimeout(() => {
        if (!hasDetectedBeatRef.current) {
          setNoMusicDetected(true);
        }
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      console.error('Error starting audio processor:', err);
    }
  };

  const stopListening = () => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
      audioProcessorRef.current = null;
    }
    if (noMusicTimerRef.current) {
      clearTimeout(noMusicTimerRef.current);
      noMusicTimerRef.current = null;
    }
    if (musicStoppedTimerRef.current) {
      clearTimeout(musicStoppedTimerRef.current);
      musicStoppedTimerRef.current = null;
    }
    setIsListening(false);
    setCurrentBeat(0);
    setCycle(0);
    setIsDownbeat(false);
    setIsDashBeat(false);
    setBPM(0);
    setNoMusicDetected(false);
    hasDetectedBeatRef.current = false;
  };

  useEffect(() => {
    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stop();
      }
      if (noMusicTimerRef.current) {
        clearTimeout(noMusicTimerRef.current);
      }
      if (musicStoppedTimerRef.current) {
        clearTimeout(musicStoppedTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1><span className="header-emoji">💃</span> <span className="header-text">Baila Beat</span></h1>
          <p className="subtitle">Learn Salsa in One Day</p>
        </header>

        {error && (
          <div className="error-message">
            <p>⚠️ {error}</p>
            <p className="error-hint">
              Please ensure you've granted microphone permissions and try again.
            </p>
          </div>
        )}

        <div className="main-content">
          <div className="bpm-section">
            <BPMDisplay bpm={bpm} />
          </div>

          <BeatCounter
            currentBeat={currentBeat || 0}
            cycle={cycle}
            isDownbeat={isDownbeat}
            isDashBeat={isDashBeat}
            isActive={currentBeat > 0}
            noMusicDetected={noMusicDetected && isListening}
          />

          <div className="controls">
            {!isListening ? (
              <button
                className="btn btn-primary"
                onClick={startListening}
                disabled={!!error}
              >
                🎤 Start Listening
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={stopListening}
              >
                ⏹ Stop
              </button>
            )}

            <label className="haptic-toggle">
              <input
                type="checkbox"
                checked={hapticEnabled}
                onChange={(e) => {
                  setHapticEnabled(e.target.checked);
                  hapticFeedbackRef.current.setEnabled(e.target.checked);
                }}
              />
              <span>Haptic feedback (extra sabor)</span>
              {!hapticFeedbackRef.current.isAvailable() && (
                <span className="hint">(Not available on this device)</span>
              )}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

