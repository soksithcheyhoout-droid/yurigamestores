import React from 'react';

/**
 * CyberNeonButton - Pixel-perfect reproduction of realistic neon gaming CTA buttons.
 * Features:
 * - Protruding circular icon node on the left with concentric glowing rings
 * - Sleek dark obsidian glass body with dual neon borders and subtle inner luminescence
 * - Slanted right end-cap (-24deg angle)
 * - Triple parallel slanted neon slashes (///) matching the end-cap angle
 * - High-intensity neon bloom and hover physics
 */
export default function CyberNeonButton({
  icon,
  children,
  color = 'cyan', // 'cyan' | 'amber' | 'magenta' | 'green' | 'blue' | 'purple'
  size = 'md',    // 'sm' | 'md' | 'lg'
  onClick,
  className = '',
  showSlashes = true,
  disabled = false,
  href,
  type = 'button',
  ...props
}) {
  const Component = href ? 'a' : 'button';
  const compProps = href ? { href, ...props } : { type, disabled, onClick, ...props };

  return (
    <Component
      {...compProps}
      className={`cyber-neon-btn cyber-neon-${color} cyber-neon-${size} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
    >
      {/* 1. Left Circular Glowing Pod */}
      {icon && (
        <div className="cyber-neon-node" aria-hidden="true">
          <div className="cyber-neon-node-inner">
            {icon}
          </div>
        </div>
      )}

      {/* 2. Main Obsidian Glass Body with Neon Borders */}
      <div className={`cyber-neon-content ${!icon ? '!ml-0 !pl-4 rounded-l-lg' : ''}`}>
        <span className="cyber-neon-label">{children}</span>
      </div>

      {/* 3. Slanted End-Cap (-24deg angled forward) */}
      <div className="cyber-neon-cap" aria-hidden="true" />

      {/* 4. Triple Slanted Neon Slashes (///) */}
      {showSlashes && (
        <div className="cyber-neon-slashes" aria-hidden="true">
          <span className="cyber-neon-slash" />
          <span className="cyber-neon-slash" />
          <span className="cyber-neon-slash" />
        </div>
      )}
    </Component>
  );
}
