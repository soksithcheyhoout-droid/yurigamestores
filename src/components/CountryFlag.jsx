import React from 'react';

/**
 * High-definition, pixel-perfect SVG country flags that render reliably across
 * Windows, macOS, iOS, Android (avoiding the missing emoji flags on Windows).
 */
export default function CountryFlag({ code = 'GL', className = 'w-5 h-3.5 rounded-xs' }) {
  const c = (code || '').toUpperCase();

  switch (c) {
    case 'KH': // Cambodia
      return (
        <svg 
          viewBox="0 0 45 30" 
          className={`shrink-0 overflow-hidden shadow-2xs inline-block align-middle ${className}`}
          aria-label="Cambodia Flag"
        >
          {/* Top Blue */}
          <rect width="45" height="7.5" fill="#032EA6" />
          {/* Middle Red */}
          <rect y="7.5" width="45" height="15" fill="#E00025" />
          {/* Bottom Blue */}
          <rect y="22.5" width="45" height="7.5" fill="#032EA6" />
          {/* Angkor Wat stylized white silhouette */}
          <g fill="#FFFFFF">
            <rect x="15" y="18" width="15" height="3" />
            <polygon points="22.5,10 20.5,14 24.5,14" />
            <polygon points="17.5,12 16,15 19,15" />
            <polygon points="27.5,12 26,15 29,15" />
            <rect x="21" y="13" width="3" height="5" />
            <rect x="16.5" y="14" width="2" height="4" />
            <rect x="26.5" y="14" width="2" height="4" />
            <rect x="15" y="17" width="15" height="1" fill="#E00025" />
          </g>
        </svg>
      );

    case 'IN': // India
      return (
        <svg 
          viewBox="0 0 45 30" 
          className={`shrink-0 overflow-hidden shadow-2xs inline-block align-middle ${className}`}
          aria-label="India Flag"
        >
          {/* Saffron */}
          <rect width="45" height="10" fill="#FF9933" />
          {/* White */}
          <rect y="10" width="45" height="10" fill="#FFFFFF" />
          {/* Green */}
          <rect y="20" width="45" height="10" fill="#138808" />
          {/* Ashoka Chakra */}
          <circle cx="22.5" cy="15" r="4" fill="none" stroke="#000080" strokeWidth="0.8" />
          <circle cx="22.5" cy="15" r="0.8" fill="#000080" />
          {/* Chakra spokes */}
          <g stroke="#000080" strokeWidth="0.4">
            <line x1="22.5" y1="11" x2="22.5" y2="19" />
            <line x1="18.5" y1="15" x2="26.5" y2="15" />
            <line x1="19.7" y1="12.2" x2="25.3" y2="17.8" />
            <line x1="19.7" y1="17.8" x2="25.3" y2="12.2" />
          </g>
        </svg>
      );

    case 'TH': // Thailand
      return (
        <svg 
          viewBox="0 0 45 30" 
          className={`shrink-0 overflow-hidden shadow-2xs inline-block align-middle ${className}`}
          aria-label="Thailand Flag"
        >
          <rect width="45" height="5" fill="#A51931" />
          <rect y="5" width="45" height="5" fill="#F4F5F8" />
          <rect y="10" width="45" height="10" fill="#2D2A4A" />
          <rect y="20" width="45" height="5" fill="#F4F5F8" />
          <rect y="25" width="45" height="5" fill="#A51931" />
        </svg>
      );

    case 'MY': // Malaysia
      return (
        <svg 
          viewBox="0 0 45 30" 
          className={`shrink-0 overflow-hidden shadow-2xs inline-block align-middle ${className}`}
          aria-label="Malaysia Flag"
        >
          {/* 14 Red & White Stripes */}
          {[...Array(14)].map((_, i) => (
            <rect 
              key={i} 
              y={(i * 30) / 14} 
              width="45" 
              height={30 / 14} 
              fill={i % 2 === 0 ? '#CC0000' : '#FFFFFF'} 
            />
          ))}
          {/* Blue Canton */}
          <rect width="22" height="15" fill="#000066" />
          {/* Yellow Crescent */}
          <circle cx="9" cy="7.5" r="5" fill="#FFCC00" />
          <circle cx="10.5" cy="7.5" r="4.2" fill="#000066" />
          {/* Yellow Star */}
          <polygon 
            points="14,7.5 15,5 17,6 18,4 19,6 21,5 20,7.5 21,10 19,9 18,11 17,9 15,10" 
            fill="#FFCC00" 
          />
        </svg>
      );

    case 'GL': // Global / International
    default:
      return (
        <svg 
          viewBox="0 0 24 24" 
          className={`shrink-0 overflow-hidden inline-block align-middle text-[#E3062F] ${className}`}
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
  }
}
