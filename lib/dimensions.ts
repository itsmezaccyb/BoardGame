import { PIXELS_PER_INCH } from '@/config/dimensions';

/**
 * Converts inches to pixels based on the configured PIXELS_PER_INCH value
 * @param inches - The measurement in inches
 * @returns The equivalent measurement in pixels
 */
export function inchesToPixels(inches: number): number {
  return inches * PIXELS_PER_INCH;
}

/**
 * Sets the CSS custom property --pixels-per-inch on the document root
 * This allows using the value in CSS with calc() and CSS variables
 */
export function setCSSVariable(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--pixels-per-inch', `${PIXELS_PER_INCH}`);
  }
}


