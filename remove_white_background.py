#!/usr/bin/env python3
"""
Script to remove white backgrounds from PNG images and make them transparent.
Usage: python3 remove_white_background.py <input_file> <output_file>
"""

from PIL import Image
import numpy as np
import sys

def remove_white_background(input_path, output_path, threshold=240):
    """
    Remove white background from an image and make it transparent.

    Args:
        input_path: Path to input image
        output_path: Path to save transparent image
        threshold: Pixel values above this are considered white (0-255)
    """
    # Load the image and ensure it has alpha channel
    img = Image.open(input_path).convert('RGBA')

    # Convert to numpy array for easier processing
    data = np.array(img)

    # Create mask for white pixels (allowing for slight variations)
    white_mask = (
        (data[:, :, 0] > threshold) &  # Red channel
        (data[:, :, 1] > threshold) &  # Green channel
        (data[:, :, 2] > threshold)    # Blue channel
    )

    # Set alpha channel to 0 for white pixels (make them transparent)
    data[white_mask, 3] = 0

    # Convert back to PIL Image
    transparent_img = Image.fromarray(data)

    # Save the result
    transparent_img.save(output_path)
    print(f"White background removed! Saved as {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 remove_white_background.py <input_file> <output_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    remove_white_background(input_file, output_file)
