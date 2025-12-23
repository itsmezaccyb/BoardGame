#!/usr/bin/env python3
from PIL import Image, ImageDraw

# We'll create a properly scaled boat image
# Start with creating a moderate increase in height

# For now, let's create a simple boat-like shape to test
# Or if the original exists somewhere, load it
import os

# Check what we have
boat_path = '/Users/zacbarnes/Desktop/Gamer/public/images/catan_boat.png'
if os.path.exists(boat_path):
    img = Image.open(boat_path)
    original_width, original_height = img.size
    print(f"Current size: {original_width}x{original_height}")

    # Crop to remove the excessive space we added
    # The boat data is in the bottom 1024 pixels of the original
    # Let's assume the first 1024 pixels were the original boat
    if original_height > 1536:
        # Crop to get roughly the boat part
        crop_height = 1024
        img_cropped = img.crop((0, original_height - crop_height, original_width, original_height))

        # Now resize to a reasonable tall version
        new_height = int(crop_height * 1.3)  # 30% taller
        new_width = original_width

        # Create canvas with transparent background
        new_img = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))

        # Paste cropped boat at bottom with space on top
        y_offset = new_height - crop_height
        new_img.paste(img_cropped, (0, y_offset), img_cropped)

        # Save
        new_img.save(boat_path)
        print(f"Reset to size: {new_width}x{new_height}")
