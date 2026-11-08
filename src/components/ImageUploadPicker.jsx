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
 * Automatically cuts out solid, white, black, gradient, or colored backgrounds from logos/icons
 * using border-cluster detection, 8-connected flood fill, halo defringing, and soft edge feathering.
 * Preserves inner highlights and exports as a clean transparent PNG.
 */
export const removeImageBackground = (imageSource, tolerance = 48, feather = 20, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!imageSource) return resolve(null);

    const targetColor = options?.targetColor || 'auto'; // 'auto' | 'white' | 'black' | '#rrggbb'
    const cutInnerHoles = Boolean(options?.cutInnerHoles);
    const maxOutputDim = Number(options?.maxDimension) || 800;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to load image for background removal'));
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      if (!width || !height) return resolve(imageSource);

      if (width > maxOutputDim || height > maxOutputDim) {
        if (width > height) {
          height = Math.max(1, Math.round((height * maxOutputDim) / width));
          width = maxOutputDim;
        } else {
          width = Math.max(1, Math.round((width * maxOutputDim) / height));
          height = maxOutputDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(imageSource);

      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Helper to parse hex color
      const parseHexColor = (hex) => {
        const clean = String(hex || '').replace(/^#/, '').trim();
        if (clean.length === 3) {
          return [
            parseInt(clean[0] + clean[0], 16),
            parseInt(clean[1] + clean[1], 16),
            parseInt(clean[2] + clean[2], 16),
          ];
        }
        if (clean.length === 6) {
          return [
            parseInt(clean.slice(0, 2), 16),
            parseInt(clean.slice(2, 4), 16),
            parseInt(clean.slice(4, 6), 16),
          ];
        }
        return null;
      };

      // 1. Sample outer border strips (0..3px inset along all 4 edges) to detect background color(s).
      // Handles full-bleed backgrounds (white, black, any color, gradients) AND rounded-corner icons
      // while preserving already-transparent PNG stickers in 'auto' mode.
      const borderSamples = [];
      const step = Math.max(1, Math.floor(Math.min(width, height) / 120));
      let totalBorderProbes = 0;
      let transparentBorderProbes = 0;

      const sampleBorderPoint = (bx, by) => {
        if (bx < 0 || bx >= width || by < 0 || by >= height) return;
        totalBorderProbes++;
        const idx = (by * width + bx) * 4;
        const a = data[idx + 3];
        if (a < 35) {
          transparentBorderProbes++;
          return;
        }
        if (a >= 120) {
          borderSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
      };

      const insetDepth = Math.min(4, Math.max(1, Math.floor(Math.min(width, height) * 0.02)));
      for (let x = 0; x < width; x += step) {
        for (let d = 0; d < insetDepth; d++) {
          sampleBorderPoint(x, d);
          sampleBorderPoint(x, height - 1 - d);
        }
      }
      for (let y = 0; y < height; y += step) {
        for (let d = 0; d < insetDepth; d++) {
          sampleBorderPoint(d, y);
          sampleBorderPoint(width - 1 - d, y);
        }
      }

      const clusters = new Map();
      for (const [r, g, b] of borderSamples) {
        const key = `${r >> 4}_${g >> 4}_${b >> 4}`;
        const existing = clusters.get(key);
        if (existing) {
          existing.count++;
          existing.sumR += r;
          existing.sumG += g;
          existing.sumB += b;
        } else {
          clusters.set(key, { count: 1, sumR: r, sumG: g, sumB: b });
        }
      }

      const bgPalette = [];

      if (targetColor === 'white') {
        bgPalette.push([255, 255, 255], [245, 245, 245], [235, 235, 235]);
      } else if (targetColor === 'black') {
        bgPalette.push([0, 0, 0], [15, 15, 18], [28, 28, 34]);
      } else if (targetColor && targetColor !== 'auto' && targetColor.startsWith('#')) {
        const parsed = parseHexColor(targetColor);
        if (parsed) bgPalette.push(parsed);
      }

      const sortedClusters = [...clusters.values()].sort((a, b) => b.count - a.count);
      const topCluster = sortedClusters[0];

      // Add dominant border color clusters when in 'auto' mode (or if no explicit target color matched)
      if (borderSamples.length > 0 && (targetColor === 'auto' || bgPalette.length === 0)) {
        if (topCluster) {
          bgPalette.push([
            Math.round(topCluster.sumR / topCluster.count),
            Math.round(topCluster.sumG / topCluster.count),
            Math.round(topCluster.sumB / topCluster.count),
          ]);
        }
        for (let i = 1; i < Math.min(4, sortedClusters.length); i++) {
          const c = sortedClusters[i];
          if (c.count >= borderSamples.length * 0.12) {
            bgPalette.push([
              Math.round(c.sumR / c.count),
              Math.round(c.sumG / c.count),
              Math.round(c.sumB / c.count),
            ]);
          }
        }
      }

      // If >82% of the outer border is already transparent and targetColor is 'auto',
      // the image is already a cut-out transparent PNG — keep its outline intact and just auto-trim.
      const alreadyTransparent =
        targetColor === 'auto' &&
        totalBorderProbes > 0 &&
        (transparentBorderProbes / totalBorderProbes >= 0.82 || bgPalette.length === 0);

      // Helper: distance from pixel at `dataIdx` to closest background palette color
      const getClosestBgInfo = (dataIdx) => {
        const r = data[dataIdx];
        const g = data[dataIdx + 1];
        const b = data[dataIdx + 2];
        let minDist = Infinity;
        let bestBg = bgPalette[0] || [255, 255, 255];

        for (let i = 0; i < bgPalette.length; i++) {
          const bg = bgPalette[i];
          const dr = r - bg[0];
          const dg = g - bg[1];
          const db = b - bg[2];
          // Perceptually weighted RGB Euclidean distance
          const dist = Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11) * 1.732;
          if (dist < minDist) {
            minDist = dist;
            bestBg = bg;
          }
        }
        return { dist: minDist, bg: bestBg };
      };

      if (!alreadyTransparent && bgPalette.length > 0) {
        // 2. 8-Connected Flood Fill from all 4 outer borders inward
        const totalPixels = width * height;
        const visited = new Uint8Array(totalPixels);
        const isBgMask = new Uint8Array(totalPixels);
        const queue = new Int32Array(totalPixels);
        let head = 0;
        let tail = 0;

        const maxReachDist = tolerance + feather;

        const trySeed = (x, y) => {
          if (x < 0 || x >= width || y < 0 || y >= height) return;
          const pixelIdx = y * width + x;
          if (visited[pixelIdx]) return;
          const dataIdx = pixelIdx * 4;
          const a = data[dataIdx + 3];
          if (a < 30) {
            visited[pixelIdx] = 1;
            isBgMask[pixelIdx] = 1;
            queue[tail++] = pixelIdx;
            return;
          }
          const { dist } = getClosestBgInfo(dataIdx);
          if (dist <= maxReachDist) {
            visited[pixelIdx] = 1;
            queue[tail++] = pixelIdx;
          }
        };

        for (let x = 0; x < width; x++) {
          trySeed(x, 0);
          trySeed(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          trySeed(0, y);
          trySeed(width - 1, y);
        }

        // 8-directional offsets (cardinal + diagonal)
        const dirsX = [1, -1, 0, 0, 1, -1, 1, -1];
        const dirsY = [0, 0, 1, -1, 1, 1, -1, -1];

        while (head < tail) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);
          const cDataIdx = curr * 4;
          const origR = data[cDataIdx];
          const origG = data[cDataIdx + 1];
          const origB = data[cDataIdx + 2];
          const cAlpha = data[cDataIdx + 3];

          let currDist = 0;
          let currBg = bgPalette[0];
          if (cAlpha >= 30) {
            const info = getClosestBgInfo(cDataIdx);
            currDist = info.dist;
            currBg = info.bg;
          }

          if (cAlpha < 30 || currDist <= tolerance) {
            data[cDataIdx + 3] = 0;
            isBgMask[curr] = 1;
          } else if (currDist <= maxReachDist) {
            const factor = (currDist - tolerance) / Math.max(1, feather);
            data[cDataIdx + 3] = Math.round(data[cDataIdx + 3] * factor);
            if (factor > 0.05) {
              data[cDataIdx] = Math.min(255, Math.max(0, Math.round((origR - currBg[0] * (1 - factor)) / factor)));
              data[cDataIdx + 1] = Math.min(255, Math.max(0, Math.round((origG - currBg[1] * (1 - factor)) / factor)));
              data[cDataIdx + 2] = Math.min(255, Math.max(0, Math.round((origB - currBg[2] * (1 - factor)) / factor)));
            }
          }

          // Expand to neighbors if current pixel is transparent margin or part of the background
          if (cAlpha < 30 || currDist <= tolerance + feather * 0.65) {
            for (let d = 0; d < 8; d++) {
              const nx = cx + dirsX[d];
              const ny = cy + dirsY[d];
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
              const nIdx = ny * width + nx;
              if (visited[nIdx]) continue;

              const nDataIdx = nIdx * 4;
              if (data[nDataIdx + 3] < 30) {
                visited[nIdx] = 1;
                queue[tail++] = nIdx;
                continue;
              }

              const { dist: nDist } = getClosestBgInfo(nDataIdx);
              const stepDr = data[nDataIdx] - origR;
              const stepDg = data[nDataIdx + 1] - origG;
              const stepDb = data[nDataIdx + 2] - origB;
              const stepDist = Math.sqrt(stepDr * stepDr + stepDg * stepDg + stepDb * stepDb);

              if (nDist <= maxReachDist || (cAlpha >= 30 && stepDist <= 14 && nDist <= maxReachDist * 1.25)) {
                visited[nIdx] = 1;
                queue[tail++] = nIdx;
              }
            }
          }
        }

        // Optional: Cut interior enclosed background holes (e.g. inside letters O, A, P, R)
        if (cutInnerHoles || targetColor !== 'auto') {
          const innerTol = cutInnerHoles ? tolerance * 0.85 : tolerance * 0.6;
          for (let i = 0; i < totalPixels; i++) {
            if (visited[i]) continue;
            const dIdx = i * 4;
            if (data[dIdx + 3] < 30) continue;
            const { dist, bg } = getClosestBgInfo(dIdx);
            if (dist <= innerTol) {
              data[dIdx + 3] = 0;
              isBgMask[i] = 1;
            } else if (dist <= innerTol + feather * 0.75) {
              const factor = (dist - innerTol) / Math.max(1, feather * 0.75);
              data[dIdx + 3] = Math.round(data[dIdx + 3] * factor);
              if (factor > 0.05) {
                data[dIdx] = Math.min(255, Math.max(0, Math.round((data[dIdx] - bg[0] * (1 - factor)) / factor)));
                data[dIdx + 1] = Math.min(255, Math.max(0, Math.round((data[dIdx + 1] - bg[1] * (1 - factor)) / factor)));
                data[dIdx + 2] = Math.min(255, Math.max(0, Math.round((data[dIdx + 2] - bg[2] * (1 - factor)) / factor)));
              }
            }
          }
        }

        // 3. Anti-alias & defringe 1px boundary pixels next to transparent background
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (isBgMask[idx]) continue;
            const dIdx = idx * 4;
            const a = data[dIdx + 3];
            if (a === 0) continue;

            const touchesBg =
              isBgMask[idx - 1] ||
              isBgMask[idx + 1] ||
              isBgMask[idx - width] ||
              isBgMask[idx + width];

            if (touchesBg) {
              const { dist, bg } = getClosestBgInfo(dIdx);
              if (dist <= tolerance + feather * 1.35) {
                const factor = Math.max(0.1, Math.min(1, (dist - tolerance * 0.6) / Math.max(1, feather * 1.35)));
                data[dIdx + 3] = Math.min(a, Math.round(255 * factor));
                if (factor > 0.08) {
                  data[dIdx] = Math.min(255, Math.max(0, Math.round((data[dIdx] - bg[0] * (1 - factor)) / factor)));
                  data[dIdx + 1] = Math.min(255, Math.max(0, Math.round((data[dIdx + 1] - bg[1] * (1 - factor)) / factor)));
                  data[dIdx + 2] = Math.min(255, Math.max(0, Math.round((data[dIdx + 2] - bg[2] * (1 - factor)) / factor)));
                }
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
      }

      // 4. Auto-Trim: Crop tight bounding box around the cut-out logo so it scales cleanly
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

      if (hasVisiblePixels && (maxX - minX > 16) && (maxY - minY > 16)) {
        const pad = Math.max(4, Math.round(Math.max(maxX - minX, maxY - minY) * 0.04));
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
 * Convenience helper to compress an uploaded logo file as PNG and automatically cut its background
 * (white, black, or any color). Always returns a string data URL (or null on failure).
 */
export const processLogoFileWithAutoCut = async (
  file,
  {
    autoCut = true,
    maxWidth = 800,
    maxDimension = 800,
    tolerance = 48,
    feather = 20,
    targetColor = 'auto',
    cutInnerHoles = false,
  } = {}
) => {
  const dim = Number(maxWidth || maxDimension) || 800;
  const rawPng = await compressImageFile(file, dim, 0.92, 'png');
  if (!rawPng) return null;
  if (!autoCut) return rawPng;
  try {
    const cutPng = await removeImageBackground(rawPng, tolerance, feather, {
      targetColor,
      cutInnerHoles,
      maxDimension: dim,
      forceCut: true,
    });
    return typeof cutPng === 'string' && cutPng.startsWith('data:image/') ? cutPng : rawPng;
  } catch {
    return rawPng;
  }
};

/**
 * High-performance client-side image compression using HTML5 Canvas.
 * Supports PNG transparency for icons and JPEG for photo banners.
 */
export const compressImageFile = (file, maxDimension = 1200, quality = 0.85, format = 'auto') => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const isImage = file.type?.startsWith('image/') || file.name?.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg|heic|heif|jfif)$/i);
    if (!isImage) {
      return reject(new Error('Please select an image file (PNG, JPG, WEBP, etc.)'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file from your device.'));
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (!dataUrl) return resolve(null);

      const img = new Image();
      img.onerror = () => {
        // Fallback to raw dataUrl if canvas decode fails so upload never gets blocked
        resolve(dataUrl);
      };
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (!width || !height) return resolve(dataUrl);

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
            return resolve(dataUrl);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Preserve PNG transparency if input is PNG or format requested is PNG
          const isPng =
            file.type === 'image/png' ||
            format === 'png' ||
            (typeof format === 'object' && format?.forcePng === true) ||
            file.name?.toLowerCase().endsWith('.png');
          const outputMime = isPng ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(outputMime, isPng ? undefined : quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
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

  // Automatically enable background cutting by default for square icons/logos
  const isSquare = aspectRatio === 'square' || aspectRatio === 'logo';
  const [autoCutBg, setAutoCutBg] = useState(isSquare);
  const [bgTargetColor, setBgTargetColor] = useState('auto'); // 'auto' | 'white' | 'black' | 'custom'
  const [customHexColor, setCustomHexColor] = useState('#ffffff');
  const [cutInnerHoles, setCutInnerHoles] = useState(false);

  const resolvedTargetColor = bgTargetColor === 'custom' ? customHexColor : bgTargetColor;

  const previewHeight = isSquare ? 'h-24 w-24' : 'h-32 w-full max-w-xs';

  const handleFileSelect = async (file) => {
    if (!file) return;
    setErrorMessage('');
    setIsProcessing(true);

    try {
      const isPngTarget = isSquare || autoCutBg || file.type === 'image/png';
      const optimizedDataUrl = await compressImageFile(file, maxDimension, 0.85, isPngTarget ? 'png' : 'auto');

      if (optimizedDataUrl) {
        setOriginalValue(optimizedDataUrl);

        if (autoCutBg) {
          try {
            const transparentUrl = await removeImageBackground(optimizedDataUrl, 48, 20, {
              targetColor: resolvedTargetColor,
              cutInnerHoles,
              maxDimension,
            });
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

  const handleManualCutBg = async (e, overrideTarget) => {
    e?.stopPropagation();
    const sourceToCut = originalValue || value;
    if (!sourceToCut) return;
    setIsCuttingBg(true);
    setErrorMessage('');

    try {
      if (!originalValue) {
        setOriginalValue(value);
      }
      const colorMode = overrideTarget || resolvedTargetColor;
      const transparentUrl = await removeImageBackground(sourceToCut, 48, 20, {
        targetColor: colorMode,
        cutInnerHoles,
        maxDimension,
      });
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
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer p-4 flex flex-col sm:flex-row items-center gap-4 ${isDragging
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
              Supports PNG, JPG, WebP with Auto-Cut Background (White, Black, or Any Color)
            </span>
          </div>
        )}
      </div>

      {/* Auto-Cut Background Toggle & Color Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`autocut-${label}`}
            checked={autoCutBg}
            onChange={(e) => setAutoCutBg(e.target.checked)}
            className="accent-purple-500 rounded cursor-pointer"
          />
          <label
            htmlFor={`autocut-${label}`}
            className="cursor-pointer select-none text-slate-300 hover:text-white flex items-center gap-1 font-medium"
          >
            <Wand2 size={12} className="text-purple-400" />
            <span>Auto-cut background (White, Black, or Any Color → Transparent PNG)</span>
          </label>
        </div>

        {autoCutBg && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'auto', label: 'Auto Color' },
              { id: 'white', label: 'White BG' },
              { id: 'black', label: 'Black BG' },
              { id: 'custom', label: 'Pick Color' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={(e) => {
                  setBgTargetColor(mode.id);
                  if (value && mode.id !== 'custom') {
                    handleManualCutBg(e, mode.id);
                  }
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${bgTargetColor === mode.id
                    ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
              >
                {mode.label}
              </button>
            ))}

            {bgTargetColor === 'custom' && (
              <input
                type="color"
                value={customHexColor}
                onChange={(e) => {
                  const hex = e.target.value;
                  setCustomHexColor(hex);
                  if (value) {
                    handleManualCutBg(null, hex);
                  }
                }}
                className="h-5 w-7 rounded border border-slate-700 bg-transparent cursor-pointer p-0"
                title="Pick background color to remove"
              />
            )}

            <label className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white cursor-pointer ml-1">
              <input
                type="checkbox"
                checked={cutInnerHoles}
                onChange={(e) => {
                  setCutInnerHoles(e.target.checked);
                }}
                className="accent-purple-500 rounded cursor-pointer"
              />
              <span>Inner BG</span>
            </label>
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
