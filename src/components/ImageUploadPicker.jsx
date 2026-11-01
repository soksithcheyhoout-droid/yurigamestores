import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  Link as LinkIcon,
  RefreshCw,
  Scissors,
  Wand2,
  Undo2,
  Sparkles,
} from 'lucide-react';

/**
 * Automatically cuts out solid/white backgrounds from icons using border-connected flood fill & soft feathering.
 * Preserves inner highlights and exports as clean transparent PNG.
 */
export const removeImageBackground = (imageSource, tolerance = 50, feather = 20) => {
  return new Promise((resolve, reject) => {
    if (!imageSource) return resolve(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to load image for background removal'));
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(imageSource);

      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // 1. Sample corners and border midpoints to determine dominant background color
      const samplePoints = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
        [Math.floor(width / 2), 0],
        [Math.floor(width / 2), height - 1],
        [0, Math.floor(height / 2)],
        [width - 1, Math.floor(height / 2)],
        [2, 2],
        [width - 3, 2],
        [2, height - 3],
        [width - 3, height - 3],
      ];

      let sumR = 0, sumG = 0, sumB = 0, validSamples = 0;
      let alreadyTransparentCorners = 0;

      for (const [sx, sy] of samplePoints) {
        if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
        const idx = (sy * width + sx) * 4;
        const a = data[idx + 3];
        if (a < 30) {
          alreadyTransparentCorners++;
        } else {
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          validSamples++;
        }
      }

      // If corners are already transparent, image is already cleanly cut out!
      if (alreadyTransparentCorners >= 8 || validSamples === 0) {
        return resolve(canvas.toDataURL('image/png'));
      }

      const bgR = Math.round(sumR / validSamples);
      const bgG = Math.round(sumG / validSamples);
      const bgB = Math.round(sumB / validSamples);

      // Color distance helper (Euclidean distance in RGB space)
      const colorDistance = (idx) => {
        const dr = data[idx] - bgR;
        const dg = data[idx + 1] - bgG;
        const db = data[idx + 2] - bgB;
        return Math.sqrt(dr * dr + dg * dg + db * db);
      };

      // 2. Flood Fill from all 4 outer borders inward (Edge-connected mask)
      const totalPixels = width * height;
      const visited = new Uint8Array(totalPixels);
      const queue = new Int32Array(totalPixels);
      let head = 0;
      let tail = 0;

      const tryPush = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        const pixelIdx = y * width + x;
        if (visited[pixelIdx]) return;
        const dataIdx = pixelIdx * 4;
        const dist = colorDistance(dataIdx);
        if (dist <= tolerance + feather) {
          visited[pixelIdx] = 1;
          queue[tail++] = pixelIdx;
        }
      };

      // Seed all 4 outer borders
      for (let x = 0; x < width; x++) {
        tryPush(x, 0);
        tryPush(x, height - 1);
      }
      for (let y = 0; y < height; y++) {
        tryPush(0, y);
        tryPush(width - 1, y);
      }

      // BFS flood fill traversal
      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % width;
        const cy = Math.floor(curr / width);
        const cDataIdx = curr * 4;
        const dist = colorDistance(cDataIdx);

        if (dist <= tolerance) {
          // Pure background pixel -> 100% transparent
          data[cDataIdx + 3] = 0;
        } else if (dist <= tolerance + feather) {
          // Feathered boundary pixel -> smooth transition to prevent jagged edges
          const factor = (dist - tolerance) / feather;
          data[cDataIdx + 3] = Math.round(255 * factor);
          // Defringe halo
          if (factor > 0.05) {
            data[cDataIdx] = Math.min(255, Math.max(0, Math.round((data[cDataIdx] - bgR * (1 - factor)) / factor)));
            data[cDataIdx + 1] = Math.min(255, Math.max(0, Math.round((data[cDataIdx + 1] - bgG * (1 - factor)) / factor)));
            data[cDataIdx + 2] = Math.min(255, Math.max(0, Math.round((data[cDataIdx + 2] - bgB * (1 - factor)) / factor)));
          }
        }

        // Check 4-connected neighbors
        if (cx + 1 < width && !visited[curr + 1]) {
          const nDataIdx = (curr + 1) * 4;
          if (colorDistance(nDataIdx) <= tolerance + feather) {
            visited[curr + 1] = 1;
            queue[tail++] = curr + 1;
          }
        }
        if (cx - 1 >= 0 && !visited[curr - 1]) {
          const nDataIdx = (curr - 1) * 4;
          if (colorDistance(nDataIdx) <= tolerance + feather) {
            visited[curr - 1] = 1;
            queue[tail++] = curr - 1;
          }
        }
        if (cy + 1 < height && !visited[curr + width]) {
          const nDataIdx = (curr + width) * 4;
          if (colorDistance(nDataIdx) <= tolerance + feather) {
            visited[curr + width] = 1;
            queue[tail++] = curr + width;
          }
        }
        if (cy - 1 >= 0 && !visited[curr - width]) {
          const nDataIdx = (curr - width) * 4;
          if (colorDistance(nDataIdx) <= tolerance + feather) {
            visited[curr - width] = 1;
            queue[tail++] = curr - width;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Auto-Trim: Crop tight bounding box around the icon to avoid empty margins and make it look clean
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      let hasVisiblePixels = false;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const a = data[(y * width + x) * 4 + 3];
          if (a > 20) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            hasVisiblePixels = true;
          }
        }
      }

      if (hasVisiblePixels && (maxX - minX > 20) && (maxY - minY > 20)) {
        const pad = Math.max(6, Math.round(Math.max(maxX - minX, maxY - minY) * 0.05));
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(width - cropX, (maxX - minX) + pad * 2);
        const cropH = Math.min(height - cropY, (maxY - minY) + pad * 2);

        const maxDim = Math.max(cropW, cropH);
        const trimCanvas = document.createElement('canvas');
        trimCanvas.width = maxDim;
        trimCanvas.height = maxDim;
        const trimCtx = trimCanvas.getContext('2d');
        if (trimCtx) {
          const offsetX = Math.floor((maxDim - cropW) / 2);
          const offsetY = Math.floor((maxDim - cropH) / 2);
          trimCtx.drawImage(canvas, cropX, cropY, cropW, cropH, offsetX, offsetY, cropW, cropH);
          return resolve(trimCanvas.toDataURL('image/png'));
        }
      }

      const transparentPng = canvas.toDataURL('image/png');
      resolve(transparentPng);
    };
    img.src = imageSource;
  });
};

/**
 * High-performance client-side image compression using HTML5 Canvas.
 * Supports PNG transparency for icons and JPEG for photo banners.
 */
export const compressImageFile = (file, maxDimension = 1200, quality = 0.85, format = 'auto') => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image preview'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target.result);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Preserve PNG transparency if input is PNG or format requested is PNG
        const isPng = file.type === 'image/png' || format === 'png' || file.name?.toLowerCase().endsWith('.png');
        const outputMime = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputMime, isPng ? undefined : quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function ImageUploadPicker({
  label = 'Image / Icon',
  value = '',
  onChange,
  placeholder = 'Click to choose image from your PC or Phone',
  aspectRatio = 'square', // 'square', 'banner', 'auto'
  maxDimension = 1200,
  helperText = '',
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCuttingBg, setIsCuttingBg] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [wasAutoCut, setWasAutoCut] = useState(false);

  // Automatically enable background cutting by default for square icons (weekly pass, diamonds, robux)
  const isSquare = aspectRatio === 'square';
  const [autoCutBg, setAutoCutBg] = useState(isSquare);

  const previewHeight = isSquare ? 'h-24 w-24' : 'h-32 w-full max-w-xs';

  const handleFileSelect = async (file) => {
    if (!file) return;
    setErrorMessage('');
    setIsProcessing(true);

    try {
      const isPngTarget = isSquare || file.type === 'image/png';
      const optimizedDataUrl = await compressImageFile(file, maxDimension, 0.85, isPngTarget ? 'png' : 'auto');

      if (optimizedDataUrl) {
        setOriginalValue(optimizedDataUrl);

        if (autoCutBg) {
          try {
            const transparentUrl = await removeImageBackground(optimizedDataUrl, 42, 18);
            if (onChange) onChange(transparentUrl);
            setWasAutoCut(true);
          } catch {
            if (onChange) onChange(optimizedDataUrl);
            setWasAutoCut(false);
          }
        } else {
          if (onChange) onChange(optimizedDataUrl);
          setWasAutoCut(false);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error processing image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCutBg = async (e) => {
    e?.stopPropagation();
    if (!value) return;
    setIsCuttingBg(true);
    setErrorMessage('');

    try {
      if (!originalValue) {
        setOriginalValue(value);
      }
      const transparentUrl = await removeImageBackground(value, 42, 18);
      if (transparentUrl && onChange) {
        onChange(transparentUrl);
        setWasAutoCut(true);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Could not remove background from image.');
    } finally {
      setIsCuttingBg(false);
    }
  };

  const handleRevertOriginal = (e) => {
    e?.stopPropagation();
    if (originalValue && onChange) {
      onChange(originalValue);
      setWasAutoCut(false);
    }
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleTriggerPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('');
    }
    setOriginalValue('');
    setWasAutoCut(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-300">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
        >
          <LinkIcon size={11} />
          <span>{showUrlInput ? 'Hide URL input' : 'Paste URL instead'}</span>
        </button>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        onChange={onFileInputChange}
        className="hidden"
      />

      {/* Main Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleTriggerPicker}
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer p-4 flex flex-col sm:flex-row items-center gap-4 ${
          isDragging
            ? 'border-[#E3062F] bg-[#E3062F]/10 scale-[1.01]'
            : value
            ? 'border-emerald-500/40 bg-slate-900/90 hover:border-emerald-500/70'
            : 'border-slate-700 bg-slate-900/60 hover:border-[#E3062F]/60 hover:bg-slate-900'
        }`}
      >
        {/* Preview Thumbnail If Image Loaded */}
        {value ? (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            {/* Checkerboard container to clearly visualize transparent cutouts */}
            <div
              className={`relative ${previewHeight} rounded-xl overflow-hidden border border-slate-700 shrink-0 group flex items-center justify-center p-1.5`}
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #181a24 25%, transparent 25%),
                  linear-gradient(-45deg, #181a24 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #181a24 75%),
                  linear-gradient(-45deg, transparent 75%, #181a24 75%)
                `,
                backgroundSize: '14px 14px',
                backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                backgroundColor: '#0c0d14',
              }}
            >
              <img
                src={value}
                alt="Upload preview"
                className="w-full h-full object-contain drop-shadow"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <RefreshCw size={18} className="text-white drop-shadow" />
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-400 font-bold text-xs mb-1">
                <CheckCircle2 size={14} />
                <span>
                  {wasAutoCut ? '✨ Background Cut (Transparent PNG)' : 'Image Loaded from Device'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Tap anywhere to change photo from PC / Phone
              </p>

              {/* Action Buttons */}
              <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {/* Magic Auto-Cut Background button */}
                <button
                  type="button"
                  onClick={handleManualCutBg}
                  disabled={isCuttingBg}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  title="Automatically cut out white or solid background"
                >
                  <Scissors size={12} className={isCuttingBg ? 'animate-spin' : ''} />
                  <span>{isCuttingBg ? 'Cutting...' : 'Auto-Cut BG'}</span>
                </button>

                {/* Undo Cut button if a cut was made */}
                {originalValue && originalValue !== value && (
                  <button
                    type="button"
                    onClick={handleRevertOriginal}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Restore original image"
                  >
                    <Undo2 size={12} />
                    <span>Undo Cut</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleTriggerPicker}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>Choose Another</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-[11px] font-bold border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State: Prompt User to Pick from Device */
          <div className="w-full flex flex-col items-center justify-center py-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E3062F]/20 to-rose-600/10 border border-[#E3062F]/30 flex items-center justify-center text-[#E3062F] mb-2 shadow-inner">
              {isProcessing ? (
                <RefreshCw size={22} className="animate-spin text-[#E3062F]" />
              ) : (
                <UploadCloud size={24} />
              )}
            </div>

            <span className="text-xs font-black text-white">
              {isProcessing ? 'Optimizing photo...' : <><Upload size={14} className="inline mr-1.5" /> Choose Image from PC or Phone</>}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              {placeholder}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">
              Supports PNG, JPG, WebP with Auto-Cut Background
            </span>
          </div>
        )}
      </div>

      {/* Auto-Cut Background Toggle */}
      <div className="flex items-center gap-2 pt-0.5 text-[11px]">
        <input
          type="checkbox"
          id={`autocut-${label}`}
          checked={autoCutBg}
          onChange={(e) => setAutoCutBg(e.target.checked)}
          className="accent-purple-500 rounded cursor-pointer"
        />
        <label
          htmlFor={`autocut-${label}`}
          className="cursor-pointer select-none text-slate-400 hover:text-white flex items-center gap-1 font-medium"
        >
          <Wand2 size={12} className="text-purple-400" />
          <span>Auto-cut white background on upload (Transparent PNG)</span>
        </label>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <p className="text-xs text-rose-400 font-bold">{errorMessage}</p>
      )}

      {/* Helper text */}
      {helperText && !errorMessage && (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      )}

      {/* Optional URL Input if toggled */}
      {showUrlInput && (
        <div className="pt-1 animate-in fade-in duration-150">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            placeholder="Or paste https:// direct image link here..."
            className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#E3062F]"
          />
        </div>
      )}
    </div>
  );
}
