import { motion } from 'framer-motion';

interface BPMDisplayProps {
  bpm: number;
}

export function BPMDisplay({ bpm }: BPMDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#333',
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.5rem',
      }}
    >
      <span style={{ fontSize: '1.2rem', color: '#666' }}>BPM</span>
      <motion.span
        key={bpm}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{ color: '#d63384' }}
      >
        {bpm || '--'}
      </motion.span>
    </motion.div>
  );
}

