
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimationData, AnimationFrame } from './types';
import ControlPanel from './components/ControlPanel';
import { analyzeAnimation } from './services/geminiService';

// Import libraries using * as to handle different ESM export formats defensively
// @ts-ignore
import * as GIFLibModule from 'gifuct-js';
// @ts-ignore
import * as APNGLibModule from 'apng-js';

const App: React.FC = () => {
  const [animation, setAnimation] = useState<AnimationData | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Helper to resolve library functions from different module structures
  const getLibFunc = (module: any, funcName: string) => {
    if (module[funcName]) return module[funcName];
    if (module.default && module.default[funcName]) return module.default[funcName];
    return null;
  };

  const getAPNGParser = (module: any) => {
    if (typeof module === 'function') return module;
    if (typeof module.default === 'function') return module.default;
    if (module.default && typeof module.default.default === 'function') return module.default.default;
    return null;
  };

  // Signature checks
  const isGifSignature = (buffer: Uint8Array) => {
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  };

  const isPngSignature = (buffer: Uint8Array) => {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  };

  const loadAsStaticImage = (file: File): Promise<AnimationFrame[]> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve([{ canvas, delay: 0 }]);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load as static image"));
      };
      img.src = url;
    });
  };

  // File Upload Handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setAnalysisResult(null);
    setCurrentFrame(0);
    setIsPlaying(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const fileName = file.name.toLowerCase();
      const isGif = isGifSignature(uint8Array) || fileName.endsWith('.gif');
      const isPng = isPngSignature(uint8Array) || fileName.endsWith('.png') || fileName.endsWith('.apng');
      
      let animationData: AnimationData;

      if (isGif) {
        const parseGIF = getLibFunc(GIFLibModule, 'parseGIF');
        const decompressFrames = getLibFunc(GIFLibModule, 'decompressFrames');

        if (!parseGIF || !decompressFrames) {
          throw new Error("GIF library components not found.");
        }

        const gif = parseGIF(uint8Array.buffer);
        const frames = decompressFrames(gif, true);
        
        if (frames.length === 0) throw new Error("No frames found in GIF");

        const fullWidth = gif.lsd.width;
        const fullHeight = gif.lsd.height;

        // Cumulative canvas to handle frame patches correctly
        const mainCanvas = document.createElement('canvas');
        mainCanvas.width = fullWidth;
        mainCanvas.height = fullHeight;
        const mainCtx = mainCanvas.getContext('2d')!;

        // patchCanvas to handle transparency correctly (using drawImage instead of putImageData)
        const patchCanvas = document.createElement('canvas');
        const patchCtx = patchCanvas.getContext('2d')!;

        const decodedFrames: AnimationFrame[] = [];

        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i];

          // Set patch size
          patchCanvas.width = frame.dims.width;
          patchCanvas.height = frame.dims.height;
          const patchData = patchCtx.createImageData(frame.dims.width, frame.dims.height);
          patchData.data.set(frame.patch);
          patchCtx.putImageData(patchData, 0, 0);

          // Draw the patch onto the cumulative canvas
          // Using drawImage respects transparency in the patch
          mainCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

          // Capture the current cumulative state
          const snapshot = document.createElement('canvas');
          snapshot.width = fullWidth;
          snapshot.height = fullHeight;
          const snapCtx = snapshot.getContext('2d')!;
          snapCtx.drawImage(mainCanvas, 0, 0);

          decodedFrames.push({ canvas: snapshot, delay: frame.delay });

          // Post-processing: Disposal method handling for the NEXT frame
          // Disposal 2: Restore to background (clear the patch area)
          if (frame.disposalType === 2) {
            mainCtx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
          }
          // Disposal 3: Restore to previous (simplified: often treated like disposal 0/1 in simple viewers)
        }

        animationData = {
          frames: decodedFrames,
          width: fullWidth,
          height: fullHeight,
          fileName: file.name,
          type: 'gif'
        };
      } else if (isPng) {
        const parseAPNG = getAPNGParser(APNGLibModule);
        if (!parseAPNG) {
          throw new Error("APNG library parser not found.");
        }

        const apng = parseAPNG(uint8Array);
        
        if (apng instanceof Error) {
          console.warn("APNG decoder failed, falling back to static load:", apng.message);
          const staticFrames = await loadAsStaticImage(file);
          animationData = {
            frames: staticFrames,
            width: staticFrames[0].canvas.width,
            height: staticFrames[0].canvas.height,
            fileName: file.name,
            type: 'apng'
          };
        } else {
          const decodedFrames: AnimationFrame[] = await Promise.all(
            apng.frames.map(async (frame: any) => {
              const canvas = document.createElement('canvas');
              canvas.width = apng.width;
              canvas.height = apng.height;
              const img = await frame.createImage();
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(img, frame.left, frame.top);
              return { canvas, delay: frame.delay };
            })
          );

          animationData = {
            frames: decodedFrames,
            width: apng.width,
            height: apng.height,
            fileName: file.name,
            type: 'apng'
          };
        }
      } else {
        throw new Error("Unsupported file format. Please select a GIF or APNG/PNG file.");
      }

      setAnimation(animationData);
    } catch (error: any) {
      console.error("Decoding error:", error);
      alert(`Decoding Error: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Playback Loop
  const playLoop = useCallback((timestamp: number) => {
    if (!animation || !isPlaying || animation.frames.length <= 1) return;

    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const elapsed = timestamp - lastTimeRef.current;
    
    const frameDelay = animation.frames[currentFrame]?.delay || 100;
    const adjustedDelay = (frameDelay || 100) / speed;

    if (elapsed >= adjustedDelay) {
      setCurrentFrame(prev => (prev + 1) % animation.frames.length);
      lastTimeRef.current = timestamp;
    }

    timerRef.current = requestAnimationFrame(playLoop);
  }, [animation, isPlaying, currentFrame, speed]);

  useEffect(() => {
    if (isPlaying && animation && animation.frames.length > 1) {
      timerRef.current = requestAnimationFrame(playLoop);
    } else {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      lastTimeRef.current = 0;
    }
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [isPlaying, playLoop, animation]);

  // Update Canvas Display
  useEffect(() => {
    if (animation && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        const frameCanvas = animation.frames[currentFrame].canvas;
        const offsetX = (canvasRef.current.width - frameCanvas.width) / 2;
        const offsetY = (canvasRef.current.height - frameCanvas.height) / 2;
        ctx.drawImage(frameCanvas, offsetX, offsetY);
      }
    }
  }, [animation, currentFrame]);

  const handleAIAnalyze = async () => {
    if (!animation) return;
    setIsAnalyzing(true);
    setAnalysisResult("AI is processing the animation sequence...");

    const step = Math.max(1, Math.floor(animation.frames.length / 4));
    const frameIndices = [];
    for (let i = 0; i < animation.frames.length && frameIndices.length < 4; i += step) {
      frameIndices.push(i);
    }
    
    const selectedFrames = frameIndices.map(idx => animation.frames[idx].canvas.toDataURL('image/png'));
    
    const result = await analyzeAnimation(selectedFrames, "Summarize what happens in this animation.");
    setAnalysisResult(result || "No description generated.");
    setIsAnalyzing(false);
  };

  return (
    <div className="flex flex-col min-h-screen items-center p-4 md:p-8 space-y-6">
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800/50 p-6 rounded-2xl backdrop-blur-md border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg transition-transform hover:rotate-12">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            AniControl Pro
          </h1>
        </div>
        
        <label className="relative group cursor-pointer">
          <input 
            type="file" 
            accept=".gif,.apng,.png,image/gif,image/apng,image/png" 
            className="hidden" 
            onChange={handleFileUpload}
          />
          <div className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl transition-all border border-slate-600 flex items-center gap-2 group-hover:border-blue-500 shadow-lg">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Select Animation
          </div>
        </label>
      </header>

      <main className="flex-grow w-full max-w-6xl flex flex-col items-center gap-8">
        {!animation ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-700 rounded-3xl w-full bg-slate-800/20">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium">Decoding Animation Frames...</p>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 text-slate-700 mb-6">
                  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/></svg>
                </div>
                <p className="text-slate-500 text-lg">Upload a GIF or APNG to start controlling</p>
                <p className="text-slate-600 text-sm mt-2 text-center max-w-md px-4">
                  Adjust speed, seek frame-by-frame, or use AI to describe the action.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
            <div className="relative group bg-black rounded-3xl overflow-hidden shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] border border-slate-700">
              <canvas
                ref={canvasRef}
                width={animation.width}
                height={animation.height}
                className="max-w-full max-h-[60vh] object-contain cursor-crosshair"
              />
              <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono text-slate-300 border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                {animation.width}x{animation.height} • {animation.type.toUpperCase()} • {animation.frames.length} frame(s)
              </div>
            </div>

            <ControlPanel
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              currentFrame={currentFrame}
              totalFrames={animation.frames.length}
              onSeek={setCurrentFrame}
              speed={speed}
              onSpeedChange={setSpeed}
              onAnalyze={handleAIAnalyze}
              isAnalyzing={isAnalyzing}
              onPrev={() => {
                setIsPlaying(false);
                setCurrentFrame(prev => (prev - 1 + animation.frames.length) % animation.frames.length);
              }}
              onNext={() => {
                setIsPlaying(false);
                setCurrentFrame(prev => (prev + 1) % animation.frames.length);
              }}
            />

            {analysisResult && (
              <div className="w-full max-w-4xl bg-purple-900/10 border border-purple-500/30 p-6 rounded-2xl animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-3 text-purple-400 font-semibold uppercase tracking-wider text-xs">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                  Gemini Animation Insights
                </div>
                <p className="text-slate-300 leading-relaxed italic">"{analysisResult}"</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="w-full max-w-6xl py-6 text-center text-slate-600 text-sm border-t border-slate-800">
        AniControl Pro • Built with React, Tailwind, and Gemini Vision
      </footer>
    </div>
  );
};

export default App;
