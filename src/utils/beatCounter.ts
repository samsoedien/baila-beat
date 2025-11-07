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
  private cycleStartTime = 0; // When current cycle started
  private currentBPM = 0; // Current BPM for timing calculations
  private expectedBeatInterval = 0; // Expected interval between beats in ms
  private readonly maxInterval = 3000; // Reset if no beat for 3 seconds (ms)

  updateBeat(isDownbeat: boolean, timestamp: number, bpm?: number): BeatCounterState {
    const now = timestamp;
    
    // Update BPM if provided
    if (bpm && bpm > 0) {
      const previousBPM = this.currentBPM;
      // Calculate expected beat interval from BPM
      // BPM = beats per minute, so interval = 60000ms / BPM
      this.currentBPM = bpm;
      this.expectedBeatInterval = 60000 / bpm;
      
      // If BPM changed significantly (more than 10%), reset cycle on next downbeat
      // This ensures the next cycle adapts to the new tempo
      if (previousBPM > 0 && Math.abs(bpm - previousBPM) / previousBPM > 0.1) {
        // Mark that we should reset cycle on next downbeat
        // This will happen naturally when isDownbeat is true
      }
    }
    
    // Reset if too much time has passed since last beat
    if (this.lastBeatTime > 0 && now - this.lastBeatTime > this.maxInterval) {
      this.currentBeat = 0;
      this.cycle = 0;
      this.cycleStartTime = 0;
    }
    
    // If this is a downbeat, start a new cycle with current BPM timing
    if (isDownbeat) {
      this.cycle++;
      this.currentBeat = 0;
      this.cycleStartTime = now;
    } else {
      // Increment beat counter
      this.currentBeat = (this.currentBeat + 1) % 8;
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

  /**
   * Get the expected time for the next beat based on BPM
   * Returns null if BPM is not available
   */
  getExpectedNextBeatTime(): number | null {
    if (this.currentBPM === 0 || this.expectedBeatInterval === 0) {
      return null;
    }
    
    if (this.cycleStartTime === 0) {
      // No cycle started yet, use last beat time
      return this.lastBeatTime + this.expectedBeatInterval;
    }
    
    // Calculate expected time based on cycle start and beat position
    const beatsIntoCycle = this.currentBeat;
    const expectedTime = this.cycleStartTime + (beatsIntoCycle + 1) * this.expectedBeatInterval;
    return expectedTime;
  }

  reset(): void {
    this.currentBeat = 0;
    this.cycle = 0;
    this.lastBeatTime = 0;
    this.cycleStartTime = 0;
    this.currentBPM = 0;
    this.expectedBeatInterval = 0;
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

