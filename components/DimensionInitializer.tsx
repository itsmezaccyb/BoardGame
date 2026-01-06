'use client';

import { useEffect } from 'react';
import { setCSSVariable } from '@/lib/dimensions';

/**
 * Client component that initializes the CSS variable on mount
 * This ensures --pixels-per-inch is available globally in CSS
 */
export function DimensionInitializer() {
  useEffect(() => {
    setCSSVariable();
  }, []);

  return null;
}


