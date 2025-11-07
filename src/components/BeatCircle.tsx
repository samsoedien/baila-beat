import { useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

interface BeatCircleProps {
  isActive: boolean;
  isDownbeat: boolean;
  beatNumber: number;
  isDashBeat?: boolean;
}

export function BeatCircle({ isActive, isDownbeat, beatNumber, isDashBeat = false }: BeatCircleProps) {
  const [spring, api] = useSpring(() => ({
    scale: 1,
    opacity: 0.3,
    config: { tension: 300, friction: 20 },
  }));

  useEffect(() => {
    if (isActive && beatNumber > 0) {
      // Animate pulse on beat (subtle for dash beats)
      api.start({
        scale: isDashBeat ? 1.1 : isDownbeat ? 1.5 : 1.3,
        opacity: isDashBeat ? 0.5 : isDownbeat ? 1 : 0.8,
        config: { tension: 400, friction: 15 },
      });
      
      // Return to rest state
      api.start({
        scale: 1,
        opacity: isDashBeat ? 0.2 : 0.3,
        config: { tension: 200, friction: 25 },
        delay: 150,
      });
    }
  }, [isActive, isDownbeat, beatNumber, isDashBeat, api]);

  // Don't render if beat is 0 or invalid
  if (beatNumber === 0) {
    return null;
  }

  const size = isDashBeat ? 70 : isDownbeat ? 120 : 80;
  const color = isDashBeat
    ? '#ccc' // Gray for dash beats
    : isDownbeat 
    ? '#ff6b6b' // Red for downbeat
    : beatNumber === 5 || beatNumber === 7
    ? '#4ecdc4' // Teal for beats 5 and 7
    : '#95e1d3'; // Light teal for beats 2 and 3

  return (
    <animated.div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isDashBeat ? '2rem' : isDownbeat ? '2.5rem' : '1.5rem',
        fontWeight: 'bold',
        color: '#fff',
        boxShadow: isDashBeat
          ? 'none'
          : isDownbeat 
          ? `0 0 30px ${color}, 0 0 60px ${color}`
          : `0 0 15px ${color}`,
        ...spring,
      }}
    >
      {isDashBeat ? '—' : beatNumber}
    </animated.div>
  );
}

