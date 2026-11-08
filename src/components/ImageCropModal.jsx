import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Check,
  Eye,
  Sliders,
  Move
} from 'lucide-react';
import { removeImageBackground } from './ImageUploadPicker';

/**
 * Interactive Image Crop & Size Editor Modal
 * Allows admins to drag, zoom, and visually position any uploaded image
 * so it fits the game card (1:1 full square) or banner perfectly.
 */
export default function ImageCropModal({
  isOpen,
  imageSrc,
  title = 'Crop & Size Image for Full Card',
  gameName = 'Game Preview',
  aspectRatio = 1, // 1 for game cards (1:1 square), 16/9 for banners
  onSave,
  onCancel,
  enableAutoCut = false,
  isLogo = false,
}) {
  const isLogoMode = Boolean(isLogo);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [autoCutBg, setAutoCutBg] = useState(() => Boolean(isLogo && enableAutoCut));
  const [isProcessingCut, setIsProcessingCut] = useState(false);
  const [cutImageSrc, setCutImageSrc] = useState(null);
  const [fitMode, setFitMode] = useState('cover'); // 'cover' | 'contain'
  const [previewUrl, setPreviewUrl] = useState('');

  const isTransparentMode = Boolean(autoCutBg);

  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  const activeSrc = (autoCutBg && cutImageSrc) ? cutImageSrc : imageSrc;

  // Automatically trigger background cut on open only if explicitly requested as a logo cut
  useEffect(() => {
    if (isOpen && isLogo && enableAutoCut && imageSrc && !cutImageSrc) {
      setIsProcessingCut(true);
      removeImageBackground(imageSrc, 85, 20, { targetColor: 'auto', forceCut: true, trim: true })
        .then((cut) => {
          if (cut) {
            setCutImageSrc(cut);
            setAutoCutBg(true);
          }
        })
        .catch((err) => console.warn('Initial auto-cut failed:', err))
        .finally(() => setIsProcessingCut(false));
    }
  }, [isOpen, imageSrc, isLogo, enableAutoCut, cutImageSrc]);

  // Load image when imageSrc or activeSrc changes
  useEffect(() => {
    if (!activeSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setImgDimensions({ width: w, height: h });
      setImgLoaded(true);

      // Default to cover so the image fills the card 100%
      const aspect = w / h;
      const targetAspect = aspectRatio;
      let initialZoom = 1;
      if (aspect > targetAspect) {
        // Wide image: to cover height, scale by targetAspect / aspect inverted
        initialZoom = aspect / targetAspect;
      } else {
        // Tall image
        initialZoom = targetAspect / aspect;
      }
      setZoom(Math.max(1, Math.min(3, initialZoom)));
      setMinZoom(0.5);
      setPan({ x: 0, y: 0 });
    };
    img.src = activeSrc;
  }, [activeSrc, aspectRatio]);

  // Handle Auto-Cut Background toggle
  const handleToggleAutoCut = async (enable) => {
    setAutoCutBg(enable);
    if (enable && !cutImageSrc && imageSrc) {
      setIsProcessingCut(true);
      try {
        const cut = await removeImageBackground(imageSrc, 48, 20, { targetColor: 'auto', forceCut: true });
        if (cut) {
          setCutImageSrc(cut);
        }
      } catch (err) {
        console.warn('Auto cut failed:', err);
      } finally {
        setIsProcessingCut(false);
      }
    }
  };

  // Redraw canvas on zoom or pan changes
  const drawViewport = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    const iw = imgDimensions.width || img.width;
    const ih = imgDimensions.height || img.height;
    if (!iw || !ih) return;

    if (!isTransparentMode) {
      // Solid neutral dark background - zero blur or dark vignette smudges
      ctx.fillStyle = '#0b0d14';
      ctx.fillRect(0, 0, cw, ch);
    }

    // Calculate scaled foreground dimensions
    const baseScale = Math.max(cw / iw, ch / ih);
    const finalScale = baseScale * zoom;
    const dw = iw * finalScale;
    const dh = ih * finalScale;

    // Center plus pan offset
    const dx = (cw - dw) / 2 + pan.x;
    const dy = (ch - dh) / 2 + pan.y;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, dx, dy, dw, dh);

    try {
      setPreviewUrl(canvas.toDataURL('image/png', 0.9));
    } catch {
      // Ignore security errors on cross-origin images
    }
  }, [zoom, pan, imgDimensions, imgLoaded, isTransparentMode]);

  useEffect(() => {
    drawViewport();
  }, [drawViewport]);

  // Mouse / Touch Drag Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(minZoom, Math.min(3.5, Number((prev + delta).toFixed(2)))));
  };

  // Presets
  const handlePresetFill = () => {
    const img = imgRef.current;
    if (!img) return;
    const iw = imgDimensions.width;
    const ih = imgDimensions.height;
    const aspect = iw / ih;
    const initialZoom = aspect > aspectRatio ? aspect / aspectRatio : aspectRatio / aspect;
    setZoom(Math.max(1, Math.min(3, initialZoom)));
    setPan({ x: 0, y: 0 });
    setFitMode('cover');
  };

  const handlePresetFit = () => {
    setZoom(0.88);
    setPan({ x: 0, y: 0 });
    setFitMode('contain');
  };

  const handlePresetReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Final high-res export
  const handleExport = () => {
    const img = imgRef.current;
    if (!img) return;

    const targetSize = 600;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetSize;
    outCanvas.height = Math.round(targetSize / aspectRatio);
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    const ow = outCanvas.width;
    const oh = outCanvas.height;
    const iw = imgDimensions.width || img.width;
    const ih = imgDimensions.height || img.height;

    outCtx.clearRect(0, 0, ow, oh);

    if (!isTransparentMode) {
      // Solid neutral dark background - zero blur or dark vignette smudges
      outCtx.fillStyle = '#0b0d14';
      outCtx.fillRect(0, 0, ow, oh);
    }

    // Scale factors relative to viewport canvas
    const previewCanvas = canvasRef.current;
    const scaleFactor = ow / (previewCanvas ? previewCanvas.width : 340);

    const baseScale = Math.max(ow / iw, oh / ih);
    const finalScale = baseScale * zoom;
    const dw = iw * finalScale;
    const dh = ih * finalScale;
    const dx = (ow - dw) / 2 + (pan.x * scaleFactor);
    const dy = (oh - dh) / 2 + (pan.y * scaleFactor);

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(img, dx, dy, dw, dh);

    let dataUrl = '';
    if (isTransparentMode) {
      // Always save transparent cutouts as clean, lossless PNG
      dataUrl = outCanvas.toDataURL('image/png');
    } else {
      try {
        dataUrl = outCanvas.toDataURL('image/webp', 0.88);
        if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
          dataUrl = outCanvas.toDataURL('image/png', 0.9);
        }
      } catch {
        dataUrl = outCanvas.toDataURL('image/png');
      }
    }
    onSave?.(dataUrl);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border border-slate-700/80 bg-[#0c0d14] shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-[#11121b]">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white m-0 flex items-center gap-2">
              <Sliders size={18} className="text-[#E3062F]" />
              <span>{title}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 m-0">
              Drag to position and use the slider or scroll to zoom. Fits 100% full card cleanly.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer border-0 bg-transparent transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Editor Canvas + Live Card Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6 items-center">
          {/* Left: Interactive Canvas Editor */}
          <div className="flex flex-col items-center gap-4">
            <div
              ref={containerRef}
              className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] rounded-2xl overflow-hidden border-2 border-dashed border-[#E3062F]/70 shadow-2xl cursor-grab active:cursor-grabbing select-none flex items-center justify-center"
              style={isTransparentMode ? {
                backgroundImage:
                  'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                backgroundColor: '#0f172a',
              } : {
                backgroundColor: '#020617',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              title="Click and drag to pan image, scroll mouse wheel to zoom"
            >
              <canvas
                ref={canvasRef}
                width={340}
                height={Math.round(340 / aspectRatio)}
                className="w-full h-full pointer-events-none"
              />

              {/* Center Crosshair Guide */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
                <div className="w-8 h-8 border border-white/60 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white/80 rounded-full" />
                </div>
              </div>

              {/* Drag Hint Badge */}
              <div className="pointer-events-none absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/80 text-[10px] text-slate-300 font-bold flex items-center gap-1 border border-slate-700/60">
                <Move size={11} className="text-[#E3062F]" />
                <span>Drag to Pan · Wheel to Zoom</span>
              </div>
            </div>

            {/* Zoom / Size Slider & Preset Controls */}
            <div className="w-full max-w-[340px] space-y-3">
              <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(minZoom, Number((z - 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer border-0"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>

                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min={minZoom}
                    max={3.5}
                    step={0.02}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-[#E3062F] cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-white min-w-[42px] text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer border-0"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePresetFill}
                    className="px-2.5 py-1.5 rounded-lg bg-[#E3062F]/15 hover:bg-[#E3062F]/25 text-[#ff4d6d] border border-[#E3062F]/40 text-xs font-black cursor-pointer flex items-center gap-1"
                  >
                    <Maximize2 size={12} />
                    <span>Fill Full Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePresetFit}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer border border-slate-700 flex items-center gap-1"
                  >
                    <Minimize2 size={12} />
                    <span>Fit Whole Image</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePresetReset}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold cursor-pointer border border-slate-700 flex items-center gap-1"
                  title="Reset Pan & Zoom"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              </div>

              {/* Background Mode Selector */}
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Background Mode</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${autoCutBg ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {autoCutBg ? 'Transparent Cut' : 'Original Background (No Cut)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAutoCut(false)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                      !autoCutBg
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                    }`}
                  >
                    <Check size={13} className={!autoCutBg ? 'opacity-100' : 'opacity-0'} />
                    <span>Keep Original (No Cut)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleAutoCut(true)}
                    disabled={isProcessingCut}
                    className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                      autoCutBg
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                    }`}
                  >
                    <Sparkles size={13} className={isProcessingCut ? 'animate-spin' : ''} />
                    <span>{isProcessingCut ? 'Cutting...' : 'Cut Background'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Storefront Card Preview */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Eye size={13} className="text-[#E3062F]" />
              <span>{aspectRatio === 1 ? 'Live Card Preview' : 'Live Banner Preview'}</span>
            </span>

            {/* Scaled-down realistic storefront card representation */}
            {aspectRatio === 1 ? (
              <div className="w-[180px] rounded-2xl bg-gradient-to-b from-[#181926]/95 to-[#0b0c12]/98 border border-slate-800/90 shadow-xl overflow-hidden pointer-events-none select-none">
                <div
                  className="relative aspect-square w-full overflow-hidden flex items-center justify-center p-1.5"
                  style={isTransparentMode ? {
                    backgroundImage:
                      'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                    backgroundColor: '#0f172a',
                  } : {
                    backgroundColor: '#101118',
                  }}
                >
                  <img
                    src={previewUrl || activeSrc}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-black/85 px-1.5 py-0.5 text-[8px] font-black text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {isLogoMode ? 'TRANSPARENT' : 'IN STOCK'}
                  </span>
                </div>
                <div className="p-2.5 flex flex-col items-center gap-1.5 text-center">
                  <span className="font-black text-white text-xs truncate w-full">
                    {gameName}
                  </span>
                  <span className="w-full py-1 rounded-full bg-gradient-to-r from-[#e3062f] to-[#ff2b54] text-white text-[10px] font-black uppercase tracking-wider">
                    {isLogoMode ? 'LOGO' : 'TOP UP'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-[210px] rounded-2xl bg-gradient-to-b from-[#181926]/95 to-[#0b0c12]/98 border border-slate-800/90 shadow-xl overflow-hidden pointer-events-none select-none">
                <div className="relative aspect-video w-full overflow-hidden bg-[#101118]">
                  <img
                    src={previewUrl || activeSrc}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2 text-center">
                  <span className="font-black text-white text-xs truncate w-full block">
                    {gameName}
                  </span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-500 text-center mt-2 m-0 max-w-[190px]">
              {aspectRatio === 1
                ? 'This matches the live homepage appearance exactly.'
                : 'This matches the wide cover banner appearance exactly.'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4 bg-[#11121b]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer border-0 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E3062F] to-rose-600 hover:from-rose-600 hover:to-[#E3062F] text-white font-black text-xs uppercase tracking-wider cursor-pointer border-0 shadow-lg flex items-center gap-2 transition-transform active:scale-[0.98]"
          >
            <Check size={16} />
            <span>Save & Apply (Full Card)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
