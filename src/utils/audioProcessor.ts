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
  private readonly historySize = 43; // ~1 second at 44.1kHz with 1024 buffer
  private readonly energyThresholdMultiplier = 1.3; // More sensitive for mobile devices
  private readonly downbeatInterval = 8; // 8 beats per cycle
  private readonly minEnergyThreshold = 1; // Lower threshold for mobile devices
  
  // BPM calculation
  private bpmHistory: number[] = [];
  private readonly bpmHistorySize = 10;
  private lastBeatTime = 0;
  private beatCount = 0;
  
  // Band-pass filter for percussion frequencies (80-200 Hz)
  private bandpassFilter: BiquadFilterNode | null = null;
  
  constructor(callbacks: AudioProcessorCallbacks) {
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    try {
      // Request microphone access
      // On mobile, allow browser to optimize audio settings
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: isMobile ? true : false, // Enable on mobile for better quality
          noiseSuppression: isMobile ? true : false, // Enable on mobile
          autoGainControl: isMobile ? true : false, // Enable on mobile for consistent levels
          sampleRate: 44100,
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: 44100 });
      
      // Create microphone source
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;
      
      // On mobile, connect directly to analyser (no bandpass filter)
      // On desktop, use bandpass filter for better beat detection
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile: direct connection for better sensitivity
        this.microphone.connect(this.analyser);
      } else {
        // Desktop: use bandpass filter for percussion frequencies
        this.bandpassFilter = this.audioContext.createBiquadFilter();
        this.bandpassFilter.type = 'bandpass';
        this.bandpassFilter.frequency.value = 140; // Center frequency
        this.bandpassFilter.Q.value = 1; // Quality factor
        this.microphone.connect(this.bandpassFilter);
        this.bandpassFilter.connect(this.analyser);
      }
      
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
  }

  private processAudio(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate energy (sum of frequency amplitudes)
    const energy = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

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
        const isDownbeat = this.isDownbeat();
        
        // Calculate BPM
        if (this.lastBeatTime > 0) {
          const interval = timestamp - this.lastBeatTime;
          const bpm = 60000 / interval; // Convert ms to BPM
          
          // Filter reasonable BPM range (60-200 BPM for salsa)
          if (bpm >= 60 && bpm <= 200) {
            this.bpmHistory.push(bpm);
            if (this.bpmHistory.length > this.bpmHistorySize) {
              this.bpmHistory.shift();
            }
            
            // Calculate average BPM
            const avgBPM = this.bpmHistory.reduce((a, b) => a + b, 0) / this.bpmHistory.length;
            this.callbacks.onBPMUpdate(Math.round(avgBPM));
          }
        }
        
        this.lastBeatTime = timestamp;
        this.beatCount++;
        
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
      return false;
    }

    // Calculate average energy
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    
    // If average energy is too low, likely no music playing - filter out silence
    if (avgEnergy < this.minEnergyThreshold) {
      return false;
    }
    
    // Calculate variance
    const variance = this.energyHistory.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / this.energyHistory.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Dynamic threshold based on average energy and variance
    const threshold = avgEnergy + (this.energyThresholdMultiplier * standardDeviation);
    
    // Beat detected if current energy exceeds threshold
    // More lenient threshold for mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const relativeThreshold = isMobile ? 1.05 : 1.1; // Lower threshold for mobile
    const beatDetected = currentEnergy > threshold && currentEnergy > avgEnergy * relativeThreshold;
    
    // Prevent multiple beats too close together (minimum 200ms apart)
    const now = performance.now();
    const minInterval = 200; // ms
    if (beatDetected && this.beatHistory.length > 0) {
      const lastBeatTime = this.beatHistory[this.beatHistory.length - 1];
      if (now - lastBeatTime < minInterval) {
        return false;
      }
    }
    
    if (beatDetected) {
      this.beatHistory.push(now);
      // Keep only recent beat history (last 2 seconds)
      if (this.beatHistory.length > 10) {
        this.beatHistory.shift();
      }
    }
    
    return beatDetected;
  }

  private isDownbeat(): boolean {
    // Downbeat occurs every 8 beats
    return this.beatCount % this.downbeatInterval === 0;
  }

  getBPM(): number {
    if (this.bpmHistory.length === 0) return 0;
    return Math.round(
      this.bpmHistory.reduce((a, b) => a + b, 0) / this.bpmHistory.length
    );
  }
}

