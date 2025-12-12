import React, { useState } from 'react';
import { Meme } from '../types';

interface MemeCardProps {
  meme: Meme;
  index: number;
}

// Icons
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const MemeCard: React.FC<MemeCardProps> = ({ meme, index }) => {
  const [copyImageState, setCopyImageState] = useState<'idle' | 'copied'>('idle');
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [copyCaptionState, setCopyCaptionState] = useState<'idle' | 'copied'>('idle');
  const [copyPromptState, setCopyPromptState] = useState<'idle' | 'copied'>('idle');

  // --- Handlers ---

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(meme.caption);
    setCopyCaptionState('copied');
    setTimeout(() => setCopyCaptionState('idle'), 2000);
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(meme.imagePrompt);
    setCopyPromptState('copied');
    setTimeout(() => setCopyPromptState('idle'), 2000);
  };

  const handleDownloadImage = () => {
    if (!meme.imageUrl) return;
    setDownloadState('downloading');
    
    // Create a temporary link to download the base64 data
    const link = document.createElement('a');
    link.href = meme.imageUrl;
    link.download = `meme-alchemy-${index + 1}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadState('done');
    setTimeout(() => setDownloadState('idle'), 2000);
  };

  const handleCopyImage = async () => {
    if (!meme.imageUrl) return;
    try {
      const response = await fetch(meme.imageUrl);
      const blob = await response.blob();
      
      // ClipboardItem is supported in most modern browsers for PNGs
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setCopyImageState('copied');
      setTimeout(() => setCopyImageState('idle'), 2000);
    } catch (err) {
      console.error("Failed to copy image", err);
      // Fallback or error indication could go here
    }
  };

  return (
    <div className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500 transition-all duration-300 overflow-hidden rounded-xl shadow-lg hover:shadow-amber-500/20">
      
      {/* Number Badge */}
      <div className="absolute top-0 left-0 bg-amber-500 text-black font-bold px-3 py-1 z-20 rounded-br-lg font-mono text-sm shadow-lg shadow-amber-900/50">
        #{index + 1}
      </div>

      {/* Image Container */}
      <div className="aspect-square w-full bg-black relative flex items-center justify-center overflow-hidden">
        {meme.imageUrl ? (
          <>
            <img 
              src={meme.imageUrl} 
              alt={meme.imagePrompt}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Image Toolbar (Copy/Download) */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
              <button 
                onClick={handleCopyImage}
                className="bg-black/60 hover:bg-black/90 text-white p-2 rounded-lg backdrop-blur-sm border border-white/10 transition-colors"
                title="Copy Image"
              >
                {copyImageState === 'copied' ? <CheckIcon /> : <CopyIcon />}
              </button>
              <button 
                onClick={handleDownloadImage}
                className="bg-black/60 hover:bg-black/90 text-white p-2 rounded-lg backdrop-blur-sm border border-white/10 transition-colors"
                title="Download Image"
              >
                {downloadState === 'done' ? <CheckIcon /> : <DownloadIcon />}
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
             {meme.isLoadingImage ? (
               <>
                 <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-amber-400 font-mono text-xs animate-pulse tracking-widest">
                   FORGING GOLD...
                 </p>
               </>
             ) : (
               <div className="text-slate-700">Waiting for prompt...</div>
             )}
          </div>
        )}
        
        {/* Surreal Overlay Effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none"></div>
      </div>

      {/* Caption Area */}
      <div className="p-4 relative bg-slate-900">
        <div className="flex justify-between items-start gap-2 group-hover:text-amber-100 transition-colors mb-2 min-h-[3.5rem]">
           <h3 className="font-display font-bold text-white text-lg leading-tight">
            "{meme.caption}"
           </h3>
           <button 
             onClick={handleCopyCaption}
             className="text-slate-500 hover:text-amber-400 transition-colors p-1"
             title="Copy Caption"
           >
             {copyCaptionState === 'copied' ? <CheckIcon /> : <CopyIcon />}
           </button>
        </div>
        
        <div className="w-full h-px bg-slate-800 my-3 group-hover:bg-amber-900/50 transition-colors"></div>
        
        <div className="flex items-center justify-between">
            <div className="text-[10px] text-emerald-500 font-mono uppercase tracking-widest">
                Prompt Alchemy
            </div>
            <button 
                onClick={handleCopyPrompt}
                className="text-slate-600 hover:text-emerald-400 transition-colors scale-75 p-1"
                title="Copy Prompt"
            >
                {copyPromptState === 'copied' ? <CheckIcon /> : <CopyIcon />}
            </button>
        </div>

        <p className="text-xs text-slate-400 font-mono line-clamp-3 mt-1 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
          {meme.imagePrompt}
        </p>
      </div>
    </div>
  );
};

export default MemeCard;