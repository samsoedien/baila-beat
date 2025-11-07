/**
 * 8-Count Cycle Tracker for Salsa (showing dash on beats 4 and 8)
 * Maintains a rolling beat counter 1-8, displaying dashes for beats 4 and 8
 */

export interface BeatCounterState {
  currentBeat: number; // 1-8 (beats 4 and 8 show as dash)
  cycle: number; // Current cycle number
  isDownbeat: boolean;
  isDashBeat: boolean; // true for beats 4 and 8
}

export class BeatCounter {
  private currentBeat = 0; // 0-7 internally, displayed as 1-8
  private cycle = 0;
  private lastBeatTime = 0;
  private readonly maxInterval = 3000; // Reset if no beat for 3 seconds (ms)

  updateBeat(isDownbeat: boolean, timestamp: number): BeatCounterState {
    const now = timestamp;
    
    // Reset if too much time has passed since last beat
    if (this.lastBeatTime > 0 && now - this.lastBeatTime > this.maxInterval) {
      this.currentBeat = 0;
      this.cycle = 0;
    }
    
    // Increment beat counter
    this.currentBeat = (this.currentBeat + 1) % 8;
    
    // Increment cycle on downbeat
    if (isDownbeat) {
      this.cycle++;
      // Ensure we start at beat 1 on downbeat
      this.currentBeat = 0;
    }
    
    this.lastBeatTime = now;
    
    const displayBeat = this.currentBeat + 1; // Convert 0-7 to 1-8
    const isDashBeat = displayBeat === 4 || displayBeat === 8;
    
    return {
      currentBeat: displayBeat,
      cycle: this.cycle,
      isDownbeat: isDownbeat && !isDashBeat, // Only mark as downbeat if not a dash beat
      isDashBeat,
    };
  }

  reset(): void {
    this.currentBeat = 0;
    this.cycle = 0;
    this.lastBeatTime = 0;
  }

  getState(): BeatCounterState {
    const displayBeat = this.currentBeat + 1;
    const isDashBeat = displayBeat === 4 || displayBeat === 8;
    return {
      currentBeat: displayBeat,
      cycle: this.cycle,
      isDownbeat: false,
      isDashBeat,
    };
  }
}

