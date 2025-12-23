'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface InteractiveGameSettingsPanelProps {
  children?: React.ReactNode;
}

export function InteractiveGameSettingsPanel({ children }: InteractiveGameSettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHoveringZone, setIsHoveringZone] = useState(false);
  const [isHoveringPanel, setIsHoveringPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // Close panel when mouse leaves both zone and panel
  useEffect(() => {
    if (!isHoveringZone && !isHoveringPanel && isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 100); // Small delay to allow smooth transitions
      return () => clearTimeout(timer);
    }
  }, [isHoveringZone, isHoveringPanel, isExpanded]);

  return (
    <>
      {/* Hover detection zone - invisible overlay on right side */}
      <div
        ref={zoneRef}
        className="fixed right-0 top-0 bottom-0 w-[25vw] pointer-events-auto z-40"
        onMouseEnter={() => {
          setIsHoveringZone(true);
        }}
        onMouseLeave={() => {
          setIsHoveringZone(false);
        }}
      >
        {/* Small settings button - shows when hovering in zone but panel not expanded */}
        {isHoveringZone && !isExpanded && (
          <div className="absolute right-4 top-4">
            <button
              onClick={() => setIsExpanded(true)}
              className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 shadow-lg flex items-center justify-center text-sm font-semibold transition-colors"
            >
              Settings
            </button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-[20px] bottom-[20px] w-[25vw] transition-all duration-300 ease-in-out pointer-events-auto z-50 ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onMouseEnter={() => {
          setIsHoveringPanel(true);
          setIsExpanded(true);
        }}
        onMouseLeave={() => {
          setIsHoveringPanel(false);
        }}
      >
        <div className="h-full bg-white rounded-l-lg shadow-2xl border-l border-t border-b border-gray-300 p-6 flex flex-col gap-4">
          {/* Home Button - Always at top */}
          <Link
            href="/"
            className="w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 text-center"
          >
            Home
          </Link>
          
          {/* Game-specific settings */}
          {children && (
            <div className="flex flex-col gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

