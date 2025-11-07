/**
 * Haptic Feedback Manager
 * Uses Vibration API for devices that support it
 */

export class HapticFeedback {
  private enabled: boolean = false;

  constructor() {
    // Check if vibration API is available
    // On mobile devices, vibration should be available
    this.enabled = 'vibrate' in navigator;
    
    // Log for debugging
    if (!this.enabled) {
      console.log('Vibration API not available');
    }
  }

  /**
   * Vibrate on regular beat
   */
  beat(): void {
    if (!this.enabled) return;
    
    try {
      // Use a more noticeable vibration pattern for mobile
      // Pattern: vibrate for 80ms
      navigator.vibrate(80);
    } catch (error) {
      console.warn('Vibration error:', error);
      // Don't disable on error, might be temporary
    }
  }

  /**
   * Vibrate on downbeat (beat 1)
   */
  downbeat(): void {
    if (!this.enabled) return;
    
    try {
      // Stronger vibration pattern for downbeat
      // Pattern: vibrate 120ms, pause 30ms, vibrate 120ms
      navigator.vibrate([120, 30, 120]);
    } catch (error) {
      console.warn('Vibration error:', error);
      // Don't disable on error, might be temporary
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

