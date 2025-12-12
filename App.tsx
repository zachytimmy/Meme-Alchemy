import React, { useState, useCallback, useEffect } from 'react';
import { generateMemeConcepts, generateMemeImage } from './services/geminiService';
import { Meme, AppStatus } from './types';
import MemeCard from './components/MemeCard';

// Kapre Mode Trigger Words
const KAPRE_TRIGGERS = [
  'kapre', 'manananggal', 'tikbalang', 'aswang', 
  'duwende', 'white lady', 'multo', '666', 'yaya', 'undin'
];

// Luxury icons
const GemIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/>
  </svg>
);

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/>
    <path d="M12 17h.01"/>
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
    <polyline points="16 6 12 2 8 6"></polyline>
    <line x1="12" y1="2" x2="12" y2="15"></line>
  </svg>
);

// Helper to load image for canvas
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGeneratingStrip, setIsGeneratingStrip] = useState(false);
  const [isKapreMode, setIsKapreMode] = useState(false);

  // Core Alchemy Logic
  const performAlchemy = useCallback(async (selectedTopic: string) => {
    if (!selectedTopic.trim()) return;

    // Check for Kapre Mode Triggers
    const triggerFound = KAPRE_TRIGGERS.some(trigger => 
      selectedTopic.toLowerCase().includes(trigger)
    );
    setIsKapreMode(triggerFound);

    // Update URL - Wrapped in try/catch for sandboxed environments
    try {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('topic', selectedTopic);
      if (window.location.protocol !== 'blob:') {
         window.history.pushState({}, '', newUrl);
      }
    } catch (e) {
      console.debug("URL update skipped (sandboxed environment)");
    }

    setStatus(AppStatus.GENERATING_CONCEPTS);
    setMemes([]);
    setErrorMsg(null);

    try {
      // Pass the mode flag to the service
      const concepts = await generateMemeConcepts(selectedTopic, triggerFound);
      
      const initialMemes: Meme[] = concepts.map(c => ({
        ...c,
        isLoadingImage: true,
      }));
      setMemes(initialMemes);
      setStatus(AppStatus.GENERATING_IMAGES);

      initialMemes.forEach(async (meme) => {
        try {
          const imageUrl = await generateMemeImage(meme.imagePrompt);
          setMemes(prev => prev.map(m => 
            m.id === meme.id ? { ...m, imageUrl, isLoadingImage: false } : m
          ));
        } catch (err: any) {
          console.error(`Failed to generate image for ${meme.id}`, err);
          setMemes(prev => prev.map(m => 
            m.id === meme.id ? { ...m, isLoadingImage: false, error: "Image failed" } : m
          ));
        }
      });

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Alchemy failed. Try again.");
      setStatus(AppStatus.ERROR);
    }
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performAlchemy(topic);
  };

  const handleDownloadStrip = async () => {
    if (memes.some(m => !m.imageUrl)) return;
    
    setIsGeneratingStrip(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
  
      // Config
      const width = 1080;
      const padding = 60;
      const memeSpacing = 140;
      const headerHeight = 350;
      const footerHeight = 250;
      
      // Calculate required height based on content
      const imgSize = width - (padding * 2);
      const estimatedPerMeme = 150 + imgSize + 200 + memeSpacing; 
      const totalHeight = headerHeight + (memes.length * estimatedPerMeme) + footerHeight;
  
      canvas.width = width;
      canvas.height = totalHeight;
  
      // 1. Background
      ctx.fillStyle = isKapreMode ? '#1a0505' : '#050505';
      ctx.fillRect(0, 0, width, totalHeight);
      
      // 2. Decorative Border
      ctx.strokeStyle = isKapreMode ? '#7f1d1d' : '#d97706'; // Red-900 vs Amber-600
      ctx.lineWidth = 16;
      ctx.strokeRect(0, 0, width, totalHeight);
  
      // Fonts Setup
      ctx.textAlign = 'center';
      
      // 3. Header
      // Kapre font override or just colors
      ctx.font = isKapreMode ? 'bold 90px "Creepster", cursive' : 'bold 90px "Syne", sans-serif';
      ctx.fillStyle = isKapreMode ? '#ef4444' : '#fbbf24'; // Red-500 vs Amber-400
      ctx.fillText(isKapreMode ? 'KAPRE ALCHEMY' : 'MEME ALCHEMY', width / 2, 180);
      
      ctx.font = '30px "Space Mono", monospace';
      ctx.fillStyle = isKapreMode ? '#991b1b' : '#10b981'; // Red-800 vs Emerald-500
      ctx.fillText(`TOPIC: ${topic.toUpperCase()}`, width / 2, 260);
  
      let currentY = headerHeight;
  
      // 4. Draw Memes
      for (let i = 0; i < memes.length; i++) {
        const meme = memes[i];
        if (!meme.imageUrl) continue;
  
        // Number Badge
        ctx.textAlign = 'left';
        ctx.font = 'bold 80px "Space Mono", monospace';
        ctx.fillStyle = isKapreMode ? '#ef4444' : '#fbbf24';
        ctx.fillText(`#${i + 1}`, padding, currentY + 30);
  
        currentY += 60;
  
        // Image
        try {
          const img = await loadImage(meme.imageUrl);
          ctx.drawImage(img, padding, currentY, imgSize, imgSize);
          
          // Image Border
          ctx.strokeStyle = isKapreMode ? '#450a0a' : '#333'; 
          ctx.lineWidth = 2;
          ctx.strokeRect(padding, currentY, imgSize, imgSize);
        } catch (e) {
          console.error("Failed to load image for strip", e);
        }
        
        currentY += imgSize + 70;
  
        // Caption
        ctx.textAlign = 'center';
        ctx.font = 'bold 50px "Syne", sans-serif';
        ctx.fillStyle = isKapreMode ? '#fca5a5' : '#f3f4f6'; // Red-300 vs Slate-100
        
        const words = meme.caption.split(' ');
        let line = '';
        const lineHeight = 65;
        const maxWidth = width - (padding * 3);
        
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, width / 2, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, width / 2, currentY);
        
        currentY += lineHeight + memeSpacing;
      }
  
      // 5. Footer
      currentY += 50;
      ctx.font = '30px "Space Mono", monospace';
      ctx.fillStyle = isKapreMode ? '#7f1d1d' : '#64748b';
      ctx.fillText('forged with gemini 2.5 flash', width / 2, currentY);
      
      currentY += 50;
      ctx.font = 'bold 30px "Space Mono", monospace';
      ctx.fillStyle = isKapreMode ? '#ef4444' : '#d97706';
      ctx.fillText('@WatersChie', width / 2, currentY);

      if (isKapreMode) {
        currentY += 60;
        ctx.font = 'italic 20px "Space Mono", monospace';
        ctx.fillStyle = '#450a0a';
        ctx.fillText('tabi tabi po...', width / 2, currentY);
      }
  
      // 6. Download
      const finalData = ctx.getImageData(0, 0, width, currentY + 100);
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = width;
      finalCanvas.height = currentY + 100;
      const fCtx = finalCanvas.getContext('2d');
      if (fCtx) {
        fCtx.putImageData(finalData, 0, 0);
        // Redraw border on resized canvas
        fCtx.strokeStyle = isKapreMode ? '#7f1d1d' : '#d97706';
        fCtx.lineWidth = 16;
        fCtx.strokeRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        const dataUrl = finalCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `meme-alchemy-strip-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
  
    } catch (err) {
      console.error("Strip generation failed", err);
    } finally {
      setIsGeneratingStrip(false);
    }
  };

  // Deep Linking: Check URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTopic = params.get('topic');
    if (urlTopic) {
      setTopic(urlTopic);
      performAlchemy(urlTopic);
    }
  }, []);

  // Check for completion
  useEffect(() => {
    if (status === AppStatus.GENERATING_IMAGES && memes.length > 0 && memes.every(m => !m.isLoadingImage)) {
      setStatus(AppStatus.COMPLETED);
    }
  }, [memes, status]);

  // Dynamic Styles based on mode
  const theme = {
    bgGradient: isKapreMode 
      ? "from-red-950 via-black to-red-950" 
      : "from-emerald-950 via-black to-amber-950",
    orbColor: isKapreMode 
      ? "from-red-600 to-red-900" 
      : "from-amber-400 to-yellow-600",
    titleText: isKapreMode
      ? "text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]"
      : "bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-100 bg-clip-text text-transparent",
    button: isKapreMode
      ? "bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-black hover:from-red-700 hover:to-red-500 shadow-red-900/50"
      : "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:from-amber-500 hover:to-yellow-400 shadow-amber-700/70",
    pill: isKapreMode
      ? "bg-red-900/40 border-red-800/60 hover:bg-red-900/80 hover:border-red-500 text-red-200"
      : "bg-emerald-800/60 border-amber-700/60 hover:bg-amber-900/40 hover:border-amber-500 text-amber-100",
  };

  return (
    <div className={`min-h-screen bg-black transition-colors duration-1000 overflow-hidden relative ${isKapreMode ? 'text-red-100' : 'text-amber-100'}`}>
      
      {/* Kapre Mode Effects */}
      {isKapreMode && (
        <>
          <div className="scanlines"></div>
          <div className="smoke-container">
            <div className="smoke-puff" style={{ left: '10%', animationDelay: '0s' }}></div>
            <div className="smoke-puff" style={{ left: '30%', animationDelay: '2s' }}></div>
            <div className="smoke-puff" style={{ left: '60%', animationDelay: '4s' }}></div>
            <div className="smoke-puff" style={{ left: '80%', animationDelay: '1s' }}></div>
          </div>
          <div className="kapre-silhouette">
             <div className="kapre-shape"></div>
          </div>
          <div className="fixed bottom-4 right-6 z-50 text-[10px] text-red-900/50 font-mono tracking-widest italic animate-pulse">
            tabi tabi po...
          </div>
        </>
      )}

      {/* Background */}
      <div className={`fixed inset-0 bg-gradient-to-br ${theme.bgGradient} opacity-95 transition-colors duration-1000`} />
      <div className={`fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(${isKapreMode ? '150,0,0' : '212,175,55'},0.15),transparent_70%)] transition-colors duration-1000`} />
      
      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full bg-gradient-to-r ${theme.orbColor} opacity-20 blur-3xl animate-pulse transition-colors duration-1000`}
            style={{
              width: `${300 + i * 50}px`,
              height: `${300 + i * 50}px`,
              top: `${10 + i * 12}%`,
              left: `${10 + i * 15}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${12 + i}s`
            }}
          />
        ))}
      </div>

      {/* Hero */}
      <header className="pt-20 pb-16 px-6 text-center relative z-10">
        <h1 className="text-7xl md:text-9xl font-black tracking-tight">
          {isKapreMode ? (
             <span className="glitch-kapre-container text-red-600 drop-shadow-2xl">
               MEME
             </span>
          ) : (
            <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-100 bg-clip-text text-transparent drop-shadow-2xl">
              MEME
            </span>
          )}
          
          <span className={`${isKapreMode ? 'text-red-800' : 'text-emerald-400'} mx-4 drop-shadow-2xl transition-colors duration-1000`}> </span>
          
          <span className={`glitch-ai-container ${theme.titleText} drop-shadow-2xl transition-all duration-1000`}>
            ALCHEMY
          </span>
        </h1>
        <p className={`mt-6 text-xl tracking-widest font-light ${isKapreMode ? 'text-red-400/70' : 'text-amber-200/70'}`}>
          {isKapreMode ? "FORBIDDEN KNOWLEDGE FROM THE BALETE TREE" : "One topic → five forbidden memes forged in gold"}
        </p>

        {/* Input + button */}
        <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto mt-16">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={isKapreMode ? "Offer a sacrifice..." : "Tita’s group chat · Chow Chow zoomies..."}
              className={`w-full md:w-96 px-10 py-6 rounded-2xl bg-white/5 backdrop-blur-xl border-2 text-xl text-center focus:outline-none focus:ring-4 transition duration-500
                ${isKapreMode 
                  ? 'border-red-900/60 text-red-200 placeholder-red-900/60 focus:border-red-600 focus:ring-red-900/30' 
                  : 'border-amber-600/40 text-amber-100 placeholder-amber-300/60 focus:border-amber-400 focus:ring-amber-500/30'
                }
              `}
              disabled={status === AppStatus.GENERATING_CONCEPTS}
            />

            <button
              type="submit"
              disabled={!topic || status === AppStatus.GENERATING_CONCEPTS}
              className={`
                px-16 py-7 rounded-2xl font-bold text-2xl uppercase tracking-widest flex items-center gap-4 transition-all duration-500 shadow-2xl
                ${!topic || status === AppStatus.GENERATING_CONCEPTS
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : `${theme.button} hover:scale-105 active:scale-95 shadow-2xl`
                }`}
            >
              <span className="relative z-10 flex items-center gap-5">
                {status === AppStatus.GENERATING_CONCEPTS ? (
                  <>
                    {isKapreMode ? "Summoning" : "Forging"}
                    <div className={`w-8 h-8 border-4 border-black/30 rounded-full animate-spin ${isKapreMode ? 'border-t-red-500' : 'border-t-amber-300'}`} />
                  </>
                ) : (
                  <>Transmute <GemIcon /></>
                )}
              </span>
            </button>
          </div>

          {/* Example pills */}
          <div className="flex flex-wrap justify-center gap-5 mt-12">
            {["Tita’s group chat", "Chow Chow zoomies", "Adobo arguments", "Balut at midnight", "Jeepney karaoke"].map((ex) => (
              <button
                type="button"
                key={ex}
                onClick={() => {
                  setTopic(ex);
                  performAlchemy(ex);
                }}
                className={`px-8 py-4 rounded-full backdrop-blur-lg border text-lg font-medium transition-all hover:scale-105 ${theme.pill}`}
              >
                {ex}
              </button>
            ))}
          </div>
        </form>

        {errorMsg && (
          <div className="mt-10 p-6 bg-red-900/20 border border-red-800/50 text-red-400 rounded-2xl max-w-lg mx-auto flex items-center gap-3 animate-pulse">
            <WarningIcon /> {errorMsg}
          </div>
        )}
      </header>

      {/* Meme Grid */}
      <main className="container mx-auto px-6 pb-20 relative z-10">
        {memes.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {memes.map((meme, index) => (
                <MemeCard key={meme.id} meme={meme} index={index} />
              ))}

              {/* Promo Card */}
              <a 
                href="https://x.com/WatersChie"
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative bg-slate-900 border hover:border-emerald-500 transition-all duration-300 overflow-hidden rounded-xl shadow-lg flex flex-col cursor-pointer ${isKapreMode ? 'border-red-900 hover:border-red-600 hover:shadow-red-600/20' : 'border-slate-800 hover:shadow-emerald-500/20'}`}
              >
                {/* Badge */}
                <div className={`absolute top-0 left-0 text-black font-bold px-3 py-1 z-10 rounded-br-lg font-mono text-sm shadow-lg ${isKapreMode ? 'bg-red-600 shadow-red-900/50' : 'bg-emerald-500 shadow-emerald-900/50'}`}>
                  #AD
                </div>

                <div className="aspect-square w-full bg-black relative flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                  <div className="relative z-10 flex flex-col items-center p-6 text-center transform transition-transform duration-500 group-hover:scale-105">
                     <svg viewBox="0 0 24 24" className="w-20 h-20 text-white mb-4 fill-current">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                     </svg>
                     <h3 className={`font-display font-bold text-xl tracking-wide ${isKapreMode ? 'text-red-200' : 'text-amber-100'}`}>
                       Support the Alchemist
                     </h3>
                  </div>
                </div>

                <div className="p-4 relative bg-slate-900 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className={`font-display font-bold text-white text-lg leading-tight mb-2 transition-colors ${isKapreMode ? 'group-hover:text-red-400' : 'group-hover:text-emerald-400'}`}>
                      "Support the chaos. Feed the algorithm."
                    </h3>
                    <div className={`w-full h-px bg-slate-800 my-3 transition-colors ${isKapreMode ? 'group-hover:bg-red-900/50' : 'group-hover:bg-emerald-900/50'}`}></div>
                    <div className={`text-[10px] font-mono uppercase tracking-widest ${isKapreMode ? 'text-red-500' : 'text-emerald-500'}`}>
                        Support Creator
                    </div>
                  </div>
                  
                  <div className={`mt-4 flex items-center text-xs font-mono font-bold group-hover:translate-x-2 transition-transform ${isKapreMode ? 'text-red-500' : 'text-amber-500'}`}>
                     FOLLOW @WatersChie <span className="ml-2">→</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Share / Download Strip Button */}
            {status === AppStatus.COMPLETED && (
              <div className="flex justify-center mt-16 mb-8 animate-fade-in-up">
                 <button
                    onClick={handleDownloadStrip}
                    disabled={isGeneratingStrip}
                    className={`
                      group relative px-10 py-5 bg-black border rounded-xl overflow-hidden
                      font-display font-bold text-xl tracking-widest uppercase
                      transition-all duration-300 disabled:opacity-50 disabled:cursor-wait
                      ${isKapreMode 
                        ? 'border-red-900/50 text-red-200 hover:border-red-600 hover:shadow-[0_0_30px_rgba(220,38,38,0.2)]' 
                        : 'border-amber-500/50 text-amber-100 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]'
                      }
                    `}
                 >
                    <span className="relative z-10 flex items-center gap-3">
                      {isGeneratingStrip ? (
                        <>Processing <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isKapreMode ? 'border-red-500' : 'border-amber-500'}`}></div></>
                      ) : (
                        <>
                          Share My Meme <ShareIcon />
                        </>
                      )}
                    </span>
                    <div className={`absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out ${isKapreMode ? 'bg-red-900/20' : 'bg-amber-900/20'}`}></div>
                 </button>
              </div>
            )}
          </>
        )}

        {memes.length === 0 && status === AppStatus.IDLE && !errorMsg && (
          <div className="text-center mt-32 opacity-40">
            <p className={`text-lg tracking-widest ${isKapreMode ? 'text-red-800' : 'text-amber-200/50'}`}>
              {isKapreMode ? "THE SPIRITS ARE LISTENING..." : "WAITING FOR SACRIFICE..."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;