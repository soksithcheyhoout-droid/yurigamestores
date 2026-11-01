import React, { useRef, useState } from 'react';
import { Upload, UploadCloud, Image as ImageIcon, Trash2, CheckCircle2, Link as LinkIcon, RefreshCw } from 'lucide-react';

/**
 * High-performance client-side image compression using HTML5 Canvas.
 * Automatically resizes large phone camera/PC photos down to optimal web dimensions (~60-150KB),
 * preventing server lag, payload overflow, and slow loading.
 */
export const compressImageFile = (file, maxDimension = 1200, quality = 0.85) => {
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
          return resolve(e.target.result); // Fallback to raw dataURL if canvas fails
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG (supported by all browsers and devices)
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileSelect = async (file) => {
    if (!file) return;
    setErrorMessage('');
    setIsProcessing(true);

    try {
      const optimizedDataUrl = await compressImageFile(file, maxDimension, 0.85);
      if (optimizedDataUrl && onChange) {
        onChange(optimizedDataUrl);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error processing image');
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset file input so the same file can be picked again if desired
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
  };

  const isSquare = aspectRatio === 'square';
  const previewHeight = isSquare ? 'h-24 w-24' : 'h-32 w-full max-w-xs';

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

      {/* Hidden Native File Input (Triggers PC File Explorer or Phone Gallery/Camera) */}
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
            <div className={`relative ${previewHeight} rounded-xl overflow-hidden bg-black/60 border border-slate-700 shrink-0 group`}>
              <img
                src={value}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <RefreshCw size={18} className="text-white drop-shadow" />
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-400 font-bold text-xs mb-1">
                <CheckCircle2 size={14} />
                <span>Image Loaded from Device</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Tap anywhere to change photo from PC / Phone
              </p>
              <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={handleTriggerPicker}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>Choose Another</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-[11px] font-bold border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-colors"
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
              Supports PNG, JPG, WebP (Optimized automatically)
            </span>
          </div>
        )}
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

