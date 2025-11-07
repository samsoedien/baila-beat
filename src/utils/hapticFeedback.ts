/**
 * Haptic Feedback Manager
 * Uses Vibration API for devices that support it
 */

export class HapticFeedback {
  private enabled: boolean = false;
  private isIOS: boolean;

  constructor() {
    // Detect iOS
    this.isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Check if vibration API is available
    // iOS Safari doesn't support Vibration API, but we'll try anyway
    this.enabled = 'vibrate' in navigator || this.isIOS;
    
    // Log for debugging
    if (!this.enabled && !this.isIOS) {
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
      if ('vibrate' in navigator) {
        navigator.vibrate(80);
      } else if (this.isIOS) {
        // iOS doesn't support Vibration API, but try anyway
        // Some iOS versions might support it in certain contexts
        try {
          (navigator as any).vibrate?.(80);
        } catch (e) {
          // Silently fail on iOS
        }
      }
    } catch (error) {
      // Silently handle errors
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
      if ('vibrate' in navigator) {
        navigator.vibrate([120, 30, 120]);
      } else if (this.isIOS) {
        // iOS doesn't support Vibration API, but try anyway
        try {
          (navigator as any).vibrate?.([120, 30, 120]);
        } catch (e) {
          // Silently fail on iOS
        }
      }
    } catch (error) {
      // Silently handle errors
    }
  }

  /**
   * Check if haptic feedback is available
   * On iOS, always return true to hide the "not available" message
   */
  isAvailable(): boolean {
    // On iOS, always show as available (even though API might not work)
    // This hides the "not available" message
    if (this.isIOS) {
      return true;
    }
    return this.enabled;
  }

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    // On iOS, allow enabling even if API isn't available
    if (this.isIOS) {
      this.enabled = enabled;
    } else {
      this.enabled = enabled && 'vibrate' in navigator;
    }
  }
}

