#!/usr/bin/env python3
"""
Script to crop Catan resource images to create logos.
Creates catan_sheep_logo.png and catan_woods_logo.png from existing resource images.
"""

from PIL import Image
import os

def crop_center_square(image_path, output_path, size=200):
    """
    Crop a square from the center of an image.

    Args:
        image_path: Path to input image
        output_path: Path to save cropped image
        size: Size of the square crop in pixels
    """
    try:
        # Open the image
        img = Image.open(image_path)

        # Get image dimensions
        width, height = img.size

        # Calculate crop coordinates for center square
        left = (width - size) // 2
        top = (height - size) // 2
        right = left + size
        bottom = top + size

        # Crop the image
        cropped_img = img.crop((left, top, right, bottom))

        # Save the cropped image
        cropped_img.save(output_path, 'PNG')
        print(f"Created logo: {output_path}")

    except Exception as e:
        print(f"Error processing {image_path}: {e}")

def crop_custom_region(image_path, output_path, left, top, right, bottom):
    """
    Crop a custom rectangular region from an image.

    Args:
        image_path: Path to input image
        output_path: Path to save cropped image
        left, top, right, bottom: Crop coordinates
    """
    try:
        img = Image.open(image_path)
        cropped_img = img.crop((left, top, right, bottom))
        cropped_img.save(output_path, 'PNG')
        print(f"Created logo: {output_path}")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

def main():
    # Define paths
    public_images_dir = "public/images"
    source_images = {
        "catan_sheep.png": "catan_sheep_logo.png",
        "catan_woods.png": "catan_woods_logo.png"
    }

    # Check if public/images directory exists
    if not os.path.exists(public_images_dir):
        print(f"Error: {public_images_dir} directory not found!")
        return

    # Process each source image
    for source_file, output_file in source_images.items():
        source_path = os.path.join(public_images_dir, source_file)
        output_path = os.path.join(public_images_dir, output_file)

        if os.path.exists(source_path):
            # For now, crop center square - you can adjust the crop coordinates as needed
            crop_center_square(source_path, output_path, size=200)
        else:
            print(f"Warning: {source_path} not found, skipping...")

    print("Logo creation complete!")

if __name__ == "__main__":
    main()

