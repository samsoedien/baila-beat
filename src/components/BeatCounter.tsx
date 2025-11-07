import { useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

interface BeatCounterProps {
  currentBeat: number;
  cycle: number;
  isDownbeat: boolean;
  isDashBeat?: boolean;
  isActive?: boolean;
  noMusicDetected?: boolean;
}

export function BeatCounter({ currentBeat, cycle, isDownbeat, isDashBeat = false, isActive = false, noMusicDetected = false }: BeatCounterProps) {
  const [spring, api] = useSpring(() => ({
    scale: 1,
    opacity: 1,
    config: { tension: 300, friction: 20 },
  }));

  useEffect(() => {
    if (isActive && currentBeat > 0) {
      // Animate pulse on beat (subtle for dash beats)
      api.start({
        scale: isDashBeat ? 1.1 : isDownbeat ? 1.5 : 1.3,
        opacity: isDashBeat ? 0.7 : 1,
        config: { tension: 400, friction: 15 },
      });
      
      // Return to rest state
      api.start({
        scale: 1,
        opacity: 1,
        config: { tension: 200, friction: 25 },
        delay: 150,
      });
    }
  }, [isActive, isDownbeat, currentBeat, isDashBeat, api]);

  // Show "give me salsa" message when no music is detected
  if (noMusicDetected) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3rem',
        flex: 1,
        width: '100%',
      }}>
        <animated.div
          style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: '#b91c5c',
            textShadow: '0 0 10px rgba(185, 28, 92, 0.5)',
            lineHeight: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            ...spring,
          }}
        >
          give me salsa
        </animated.div>
      </div>
    );
  }

  // Don't render if beat is 0 (not initialized)
  if (currentBeat === 0) {
    return null;
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3rem',
      flex: 1,
      width: '100%',
    }}>
      <animated.div
        key={currentBeat}
        style={{
          fontSize: '8rem',
          fontWeight: 'bold',
          color: isDashBeat ? '#b91c5c' : isDownbeat ? '#c41e3a' : '#b91c5c',
          textShadow: isDashBeat 
            ? 'none'
            : isDownbeat 
            ? '0 0 20px rgba(196, 30, 58, 0.8)'
            : '0 0 10px rgba(185, 28, 92, 0.5)',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...spring,
        }}
      >
        {isDashBeat ? '—' : currentBeat}
      </animated.div>
      
      <div style={{ 
        fontSize: '1rem', 
        color: '#666',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
      }}>
        <span>Cycle {cycle}</span>
        {isDownbeat && (
          <span style={{ color: '#c41e3a', fontWeight: 'bold' }}>
            • DOWNBEAT
          </span>
        )}
      </div>
    </div>
  );
}

