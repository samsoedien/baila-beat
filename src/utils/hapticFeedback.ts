/**
 * Haptic Feedback Manager
 * Uses Vibration API for devices that support it
 */

export class HapticFeedback {
  private enabled: boolean = false;

  constructor() {
    // Check if vibration API is available
    this.enabled = 'vibrate' in navigator;
  }

  /**
   * Vibrate on regular beat
   */
  beat(): void {
    if (!this.enabled) return;
    
    try {
      navigator.vibrate(50); // Short vibration for regular beat
    } catch (error) {
      console.warn('Vibration not supported:', error);
      this.enabled = false;
    }
  }

  /**
   * Vibrate on downbeat (beat 1)
   */
  downbeat(): void {
    if (!this.enabled) return;
    
    try {
      navigator.vibrate([100, 50, 100]); // Longer, double vibration for downbeat
    } catch (error) {
      console.warn('Vibration not supported:', error);
      this.enabled = false;
    }
  }

  /**
   * Check if haptic feedback is available
   */
  isAvailable(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled && 'vibrate' in navigator;
  }
}

