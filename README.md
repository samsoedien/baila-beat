# 🎵 Baila Beat - Salsa Beat Counter

A React + Vite web application that listens to salsa music from your microphone in real-time, detects the 8-count dance rhythm, and provides visual and haptic feedback in the browser.

## Features

- 🎤 **Real-time Audio Input**: Captures live audio from your device microphone using the Web Audio API
- 🎯 **Beat Detection**: Advanced beat tracking algorithm using Web Audio DSP for real-time analysis
- 🔢 **8-Count Cycle Tracking**: Maintains a rolling beat counter (1-8) that resets on each downbeat
- 🎨 **Visual Feedback**: 
  - Animated pulsing circle for each beat
  - Highlighted downbeat (beat 1) with different color and glow effect
  - Smooth animations using React Spring and Framer Motion
- 📳 **Haptic Feedback**: Vibration API support for devices that support it
  - Brief vibration on each beat
  - Stronger/longer vibration for downbeat (beat 1)
- 🎵 **BPM Display**: Dynamic tempo estimation and display
- 🎛️ **Audio Filtering**: Band-pass filter on percussion frequencies (80-200 Hz) to improve beat detection in noisy environments

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **React Spring** - Smooth animations
- **Framer Motion** - Advanced animations
- **Web Audio API** - Audio processing and beat detection

## Project Structure

```
baila-beat/
├── src/
│   ├── components/          # React components
│   │   ├── BeatCircle.tsx   # Animated pulsing circle
│   │   ├── BeatCounter.tsx  # Beat number display
│   │   └── BPMDisplay.tsx   # BPM display component
│   ├── utils/               # Core logic modules
│   │   ├── audioProcessor.ts    # Audio capture & beat detection
│   │   ├── beatCounter.ts       # 8-count cycle tracking
│   │   └── hapticFeedback.ts    # Vibration API wrapper
│   ├── App.tsx              # Main application component
│   ├── App.css              # Application styles
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── package.json
├── vite.config.ts
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and Yarn installed
- A modern browser with microphone access (Chrome, Firefox, Safari, Edge)
- HTTPS or localhost (required for microphone access)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd baila-beat
```

2. Install dependencies:
```bash
yarn install
```

3. Start the development server:
```bash
yarn dev
```

4. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

### Building for Production

```bash
yarn build
```

The production build will be in the `dist` directory. You can preview it with:

```bash
yarn preview
```

## Testing with Live Salsa Music

### Step-by-Step Testing Guide

1. **Prepare Your Environment**:
   - Find a quiet space or use headphones to prevent feedback
   - Have a device playing salsa music (phone, computer, speaker)
   - Ensure your microphone is working and not muted

2. **Start the Application**:
   - Open the app in your browser
   - Click "Start Listening" button
   - Grant microphone permissions when prompted

3. **Position Your Microphone**:
   - Place your microphone or device near the music source
   - Keep a reasonable distance (1-3 feet) to avoid distortion
   - Avoid covering the microphone

4. **Observe the Beat Detection**:
   - The pulsing circle should animate on each detected beat
   - Beat 1 (downbeat) will be highlighted in red and larger
   - The beat counter should cycle from 1-8
   - BPM should stabilize after a few seconds

5. **Test Haptic Feedback** (Mobile devices):
   - Enable "Haptic Feedback" toggle
   - You should feel vibrations on each beat
   - Stronger vibration on beat 1 (downbeat)

### Tips for Best Results

- **Volume**: Ensure the music is loud enough for the microphone to pick up clearly
- **Background Noise**: Minimize background noise for better detection
- **Music Quality**: Clear, percussive salsa tracks work best
- **Microphone Quality**: Better microphones provide more accurate detection
- **Browser**: Chrome and Firefox typically provide the best performance

### Troubleshooting

**Microphone not working:**
- Check browser permissions (Settings → Privacy → Microphone)
- Ensure you're using HTTPS or localhost
- Try a different browser
- Check your system microphone settings

**Beat detection not accurate:**
- Increase music volume
- Move microphone closer to the music source
- Try a different salsa track with clearer percussion
- Ensure minimal background noise

**BPM not displaying:**
- Wait a few seconds for the algorithm to stabilize
- Ensure beats are being detected (watch the pulsing circle)
- Try adjusting music volume

**Haptic feedback not working:**
- Check if your device supports the Vibration API
- Ensure the toggle is enabled
- Some browsers/devices may not support vibration

## How It Works

### Beat Detection Algorithm

The app uses a real-time beat detection algorithm based on energy analysis:

1. **Audio Capture**: Microphone input is captured via Web Audio API
2. **Frequency Filtering**: Band-pass filter (80-200 Hz) isolates percussion frequencies
3. **Energy Calculation**: Sum of frequency amplitudes creates an energy signal
4. **Dynamic Threshold**: Adaptive threshold based on average energy and variance
5. **Beat Detection**: When energy exceeds threshold, a beat is detected
6. **Downbeat Detection**: Every 8th beat is marked as the downbeat

### 8-Count Cycle

- The counter increments from 1-8 on each detected beat
- Resets to 1 on each downbeat
- Automatically resets if no beats are detected for 3 seconds

### BPM Calculation

- Calculated from intervals between consecutive beats
- Filtered to reasonable range (60-200 BPM)
- Averaged over last 10 beats for stability

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ⚠️ Haptic feedback: Chrome/Edge on Android, Safari on iOS

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

