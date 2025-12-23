'use client';

import React from 'react';
import Link from 'next/link';

interface GameSettingsPanelProps {
  children?: React.ReactNode;
}

export function GameSettingsPanel({ children }: GameSettingsPanelProps) {
  return (
    <>
      {/* Transparent hover zone */}
      <div className="fixed right-0 top-[20px] bottom-[20px] w-[25vw] pointer-events-auto z-40 group">
        {/* Visible panel content */}
        <div className="h-full bg-white rounded-l-lg shadow-2xl border-l border-t border-b border-gray-300 p-6 flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out">
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

