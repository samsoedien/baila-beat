/**
 * Audio Processor for real-time beat detection
 * Uses Web Audio API for low-latency audio analysis
 */

export interface BeatDetectionResult {
  beat: boolean;
  downbeat: boolean;
  timestamp: number;
  energy: number;
}

export interface AudioProcessorCallbacks {
  onBeat: (result: BeatDetectionResult) => void;
  onBPMUpdate: (bpm: number) => void;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private callbacks: AudioProcessorCallbacks;
  
  // Beat detection parameters
  private energyHistory: number[] = [];
  private beatHistory: number[] = [];
  private previousEnergy: number = 0; // For onset detection
  private readonly historySize = 43; // ~1 second at 44.1kHz with 1024 buffer
  private readonly energyThresholdMultiplier = 1.3; // More sensitive for accurate detection
  private readonly downbeatInterval = 8; // 8 beats per cycle
  private readonly minEnergyThreshold = 1.5; // Lower threshold to catch quieter music
  private readonly onsetThreshold = 0.12; // Lower onset threshold (12%) for better detection
  
  // BPM calculation
  private bpmHistory: number[] = [];
  private readonly bpmHistorySize = 20; // Increased for more stability
  private currentStableBPM: number = 0; // Current stabilized BPM value
  private lastBeatTime = 0;
  private beatCount = 0;
  private predictedNextBeatTime: number = 0; // Predicted time for next beat
  private readonly predictionOffset = 250; // Predict beats 250ms ahead to compensate for latency
  private lastPredictedBeatTime: number = 0; // Track last predicted beat to prevent double-triggering
  
  // Band-pass filter for percussion frequencies (80-200 Hz)
  private bandpassFilter: BiquadFilterNode | null = null;
  
  constructor(callbacks: AudioProcessorCallbacks) {
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    try {
      // Detect mobile device once
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Request microphone access
      // On mobile, allow browser to optimize audio settings
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: isMobile ? true : false, // Enable on mobile for better quality
          noiseSuppression: isMobile ? true : false, // Enable on mobile
          autoGainControl: isMobile ? true : false, // Enable on mobile for consistent levels
          sampleRate: 44100,
        },
      });

      // Create audio context
      // Use 44.1kHz for consistency across devices (standard audio sample rate)
      this.audioContext = new AudioContext({ sampleRate: 44100 });
      
      // iOS requires audio context to be resumed after user interaction
      // Resume if suspended (common on iOS)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create microphone source
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3; // Same smoothing for both mobile and desktop
      
      // Use bandpass filter for kick drum frequencies (60-100 Hz)
      // Kick drums are the most reliable indicator of beats in salsa music
      this.bandpassFilter = this.audioContext.createBiquadFilter();
      this.bandpassFilter.type = 'bandpass';
      this.bandpassFilter.frequency.value = 80; // Center on kick drum frequency
      this.bandpassFilter.Q.value = 2; // Higher Q for sharper filtering
      this.microphone.connect(this.bandpassFilter);
      this.bandpassFilter.connect(this.analyser);
      
      // Start processing
      this.processAudio();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.bandpassFilter) {
      this.bandpassFilter.disconnect();
      this.bandpassFilter = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.energyHistory = [];
    this.beatHistory = [];
    this.bpmHistory = [];
    this.beatCount = 0;
    this.lastBeatTime = 0;
    this.previousEnergy = 0;
    this.currentStableBPM = 0;
    this.predictedNextBeatTime = 0;
    this.lastPredictedBeatTime = 0;
  }

  private processAudio(): void {
    if (!this.analyser) return;
    
    // Ensure audio context is running (iOS sometimes suspends it)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(err => {
        console.warn('Failed to resume audio context:', err);
      });
    }

    const now = performance.now();
    
    // Check if we should predict a beat based on timing
    if (this.predictedNextBeatTime > 0 && now >= this.predictedNextBeatTime - this.predictionOffset) {
      // We're close to predicted beat time, check if energy is rising
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate energy quickly for prediction check
      const sampleRate = this.audioContext?.sampleRate || 44100;
      const nyquist = sampleRate / 2;
      const binWidth = nyquist / bufferLength;
      
      let energy = 0;
      let totalWeight = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const freq = i * binWidth;
        let weight = 1;
        if (freq >= 40 && freq <= 120) {
          weight = 3;
        } else if (freq >= 120 && freq <= 200) {
          weight = 1.5;
        } else {
          weight = 0.5;
        }
        energy += dataArray[i] * weight;
        totalWeight += weight;
      }
      energy = energy / totalWeight;
      
      // If energy is above threshold and we're at predicted time, trigger beat early
      if (this.energyHistory.length >= this.historySize) {
        const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
        if (energy > avgEnergy * 1.05 && energy > this.minEnergyThreshold) {
          // Check if we haven't already triggered a beat recently
          if (now - this.lastPredictedBeatTime > 100) {
            // Trigger predicted beat
            const timestamp = now + this.predictionOffset; // Use predicted time
            const isDownbeat = this.isDownbeat();
            
            this.lastBeatTime = timestamp;
            this.beatCount++;
            this.lastPredictedBeatTime = now;
            
            // Update prediction for next beat
            this.updateBeatPrediction(timestamp);
            
            this.callbacks.onBeat({
              beat: true,
              downbeat: isDownbeat,
              timestamp,
              energy,
            });
            
            // Continue processing to update energy history
          }
        }
      }
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate energy with emphasis on low frequencies (kick drum range)
    // Weight lower frequencies more heavily since they contain the beat
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / bufferLength;
    
    let energy = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const freq = i * binWidth;
      let weight = 1;
      
      // Heavily emphasize kick drum frequencies (40-120 Hz)
      if (freq >= 40 && freq <= 120) {
        weight = 3; // Triple weight for kick drum range
      } else if (freq >= 120 && freq <= 200) {
        weight = 1.5; // Moderate weight for other percussion
      } else {
        weight = 0.5; // Reduce weight for higher frequencies
      }
      
      energy += dataArray[i] * weight;
      totalWeight += weight;
    }
    
    energy = energy / totalWeight; // Normalize by total weight

    // Update energy history
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    // Detect beat
    if (this.energyHistory.length >= this.historySize) {
      const beatDetected = this.detectBeat(energy);
      
      if (beatDetected) {
        const timestamp = performance.now();
        
        // Skip if we just triggered a predicted beat (prevent double-triggering)
        if (timestamp - this.lastPredictedBeatTime < 150) {
          // Continue processing to update energy history
          this.animationFrameId = requestAnimationFrame(() => this.processAudio());
          return;
        }
        
        const isDownbeat = this.isDownbeat();
        
        // Calculate BPM
        if (this.lastBeatTime > 0) {
          const interval = timestamp - this.lastBeatTime;
          const bpm = 60000 / interval; // Convert ms to BPM
          
          // Filter reasonable BPM range (60-200 BPM for salsa)
          if (bpm >= 60 && bpm <= 200) {
            // Outlier filtering: only reject if we have enough samples and stable BPM
            // Be more lenient when we don't have many samples yet
            const hasEnoughSamples = this.bpmHistory.length >= 5;
            const shouldRejectOutlier = hasEnoughSamples && this.currentStableBPM > 0;
            
            if (shouldRejectOutlier) {
              // Allow 40% deviation (more lenient) to prevent false rejections
              const maxDeviation = this.currentStableBPM * 0.4;
              if (Math.abs(bpm - this.currentStableBPM) > maxDeviation) {
                // Skip this BPM value if it's too different from stable BPM
                // But still process the beat (don't return early)
              } else {
                // BPM is acceptable, add it to history
                this.bpmHistory.push(bpm);
                if (this.bpmHistory.length > this.bpmHistorySize) {
                  this.bpmHistory.shift();
                }
              }
            } else {
              // Not enough samples yet, always add to build up history
              this.bpmHistory.push(bpm);
              if (this.bpmHistory.length > this.bpmHistorySize) {
                this.bpmHistory.shift();
              }
            }
            
            // Update stable BPM if we have enough samples
            if (this.bpmHistory.length >= 3) {
              const stableBPM = this.calculateStableBPM();
              
              // Gradually adjust stable BPM to prevent sudden jumps
              if (this.currentStableBPM === 0) {
                this.currentStableBPM = stableBPM;
              } else {
                // Smooth transition: move 20% towards new value per beat
                this.currentStableBPM = this.currentStableBPM * 0.8 + stableBPM * 0.2;
              }
              
              this.callbacks.onBPMUpdate(Math.round(this.currentStableBPM));
            }
          }
        }
        
        this.lastBeatTime = timestamp;
        this.beatCount++;
        
        // Update prediction for next beat
        this.updateBeatPrediction(timestamp);
        
        this.callbacks.onBeat({
          beat: true,
          downbeat: isDownbeat,
          timestamp,
          energy,
        });
      }
    }

    // Continue processing
    this.animationFrameId = requestAnimationFrame(() => this.processAudio());
  }

  private detectBeat(currentEnergy: number): boolean {
    if (this.energyHistory.length < this.historySize) {
      this.previousEnergy = currentEnergy;
      return false;
    }

    // Calculate average energy
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    
    // If average energy is too low, likely no music playing - filter out silence
    if (avgEnergy < this.minEnergyThreshold) {
      this.previousEnergy = currentEnergy;
      return false;
    }
    
    // Onset detection: detect rapid energy increase (beat onset)
    // This catches the beginning of the beat, not just the peak
    const energyIncrease = this.previousEnergy > 0 
      ? (currentEnergy - this.previousEnergy) / this.previousEnergy 
      : 0;
    const hasOnset = energyIncrease >= this.onsetThreshold;
    
    // Calculate variance
    const variance = this.energyHistory.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / this.energyHistory.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Dynamic threshold based on average energy and variance
    const threshold = avgEnergy + (this.energyThresholdMultiplier * standardDeviation);
    
    // Beat detected if:
    // 1. Energy exceeds dynamic threshold AND
    // 2. Has significant onset (rapid increase) OR exceeds relative threshold AND
    // 3. Energy is above minimum threshold
    const relativeThreshold = 1.08; // Slightly lower for better sensitivity
    const exceedsThreshold = currentEnergy > threshold;
    const exceedsRelative = currentEnergy > avgEnergy * relativeThreshold;
    const hasSignificantEnergy = currentEnergy > this.minEnergyThreshold;
    
    // Combine onset detection with energy threshold for more accurate beat detection
    const beatDetected = hasSignificantEnergy && exceedsThreshold && (hasOnset || exceedsRelative);
    
    // Prevent multiple beats too close together
    // Use adaptive interval based on detected BPM if available
    const now = performance.now();
    let minInterval = 200; // Default 200ms (300 BPM max)
    
    if (this.beatHistory.length >= 2) {
      // Calculate average beat interval from recent beats
      const intervals: number[] = [];
      for (let i = 1; i < this.beatHistory.length; i++) {
        intervals.push(this.beatHistory[i] - this.beatHistory[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      // Use 60% of average interval as minimum (allows for syncopation)
      minInterval = Math.max(150, Math.min(300, avgInterval * 0.6));
    }
    
    if (beatDetected && this.beatHistory.length > 0) {
      const lastBeatTime = this.beatHistory[this.beatHistory.length - 1];
      if (now - lastBeatTime < minInterval) {
        this.previousEnergy = currentEnergy;
        return false;
      }
    }
    
    if (beatDetected) {
      this.beatHistory.push(now);
      // Keep only recent beat history (last 3 seconds for better BPM calculation)
      if (this.beatHistory.length > 15) {
        this.beatHistory.shift();
      }
    }
    
    this.previousEnergy = currentEnergy;
    return beatDetected;
  }

  private isDownbeat(): boolean {
    // Downbeat occurs every 8 beats
    return this.beatCount % this.downbeatInterval === 0;
  }

  /**
   * Update prediction for when the next beat should occur
   */
  private updateBeatPrediction(currentBeatTime: number): void {
    if (this.beatHistory.length >= 2) {
      // Calculate average interval from recent beats
      const intervals: number[] = [];
      for (let i = 1; i < this.beatHistory.length; i++) {
        intervals.push(this.beatHistory[i] - this.beatHistory[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Predict next beat time based on average interval
      this.predictedNextBeatTime = currentBeatTime + avgInterval;
    } else if (this.currentStableBPM > 0) {
      // Use BPM to predict next beat
      const beatIntervalMs = 60000 / this.currentStableBPM;
      this.predictedNextBeatTime = currentBeatTime + beatIntervalMs;
    } else {
      // No prediction available yet
      this.predictedNextBeatTime = 0;
    }
  }

  /**
   * Calculate stable BPM using median filtering
   * This reduces the impact of outliers and provides more consistent values
   */
  private calculateStableBPM(): number {
    if (this.bpmHistory.length === 0) return 0;
    
    // Sort BPM values
    const sorted = [...this.bpmHistory].sort((a, b) => a - b);
    
    // Use median if we have enough samples, otherwise use average
    if (sorted.length >= 5) {
      const mid = Math.floor(sorted.length / 2);
      // Use median of middle values (remove outliers)
      const start = Math.max(0, mid - 2);
      const end = Math.min(sorted.length, mid + 3);
      const middleValues = sorted.slice(start, end);
      return middleValues.reduce((a, b) => a + b, 0) / middleValues.length;
    } else {
      // Use average for small sample sizes
      return sorted.reduce((a, b) => a + b, 0) / sorted.length;
    }
  }

  getBPM(): number {
    return Math.round(this.currentStableBPM);
  }
}

