# AniControl Pro

AniControl Pro is a high-performance, web-based animation controller designed for professional frame-by-frame analysis and playback management of GIF and APNG files. Built with React and powered by Gemini AI, it offers precise control over animated assets that standard image viewers lack.

## 🚀 Key Features

- **Universal Animation Support**: Smoothly handles both legacy `.gif` and modern `.apng` (Animated PNG) formats, including static PNG fallback.
- **Precise Frame Control**:
  - **Scrubbing**: Use the interactive timeline to seek to any specific frame.
  - **Step Controls**: Navigate backward or forward frame-by-frame for detailed inspection.
  - **Playback Toggle**: Instant play/pause functionality.
- **Variable Speed Playback**: Adjust playback speed from **0.1x (slow motion)** up to **4.0x (fast forward)** to observe subtle details or skip through long sequences.
- **AI-Powered Insights**: Integrated with **Google Gemini 1.5 Flash** to provide automated descriptions and summaries of the animation's content.
- **Canvas-Based Rendering**: Optimized rendering engine that correctly handles GIF disposal methods and transparency layers.
- **Modern UI/UX**: A sleek, dark-themed interface built with Tailwind CSS, featuring responsive design and smooth transitions.

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Decoding Libraries**: 
  - `gifuct-js` for robust GIF parsing.
  - `apng-js` for high-quality APNG decoding.
- **AI Integration**: `@google/genai` (Gemini API) for visual content analysis.

## 📖 How to Use

1. **Upload**: Click the "Select Animation" button or drag and drop a `.gif` or `.apng` file into the application.
2. **Control**: 
   - Use the **Play/Pause** button to start or stop the animation.
   - Drag the **Progress Slider** to jump to specific moments.
   - Use the **Left/Right arrow icons** to move one frame at a time.
3. **Adjust Speed**: Move the speed slider to change how fast the animation plays.
4. **Analyze**: Click the **"AI Describe"** button. The app will extract key frames and send them to the Gemini model to generate a natural language summary of the animation.

## 🔧 Technical Notes

- **GIF Disposal Methods**: The app implements custom logic for GIF `disposalType 2` (Restore to Background), ensuring that animations with transparent patches render correctly without "ghosting" artifacts.
- **Gemini API**: To use the AI analysis feature, a valid Google Gemini API key must be provided in the environment.
- **Privacy**: All image decoding and playback processing happen locally in your browser. Images are only sent to Google servers if you explicitly click the "AI Describe" button.

---
*Built by a World-Class Senior Frontend Engineer.*