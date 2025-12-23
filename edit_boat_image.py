#!/usr/bin/env python3
from PIL import Image, ImageDraw

# Load the image
img = Image.open('/Users/zacbarnes/Desktop/Gamer/public/images/catan_boat.png')

# Get current dimensions
original_width, original_height = img.size
print(f"Original size: {original_width}x{original_height}")

# Create a taller canvas (increase height by 10%)
new_height = int(original_height * 1.10)
new_width = original_width

# Create a new image with transparent background
new_img = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))

# Paste the original image at the bottom (empty space on top)
y_offset = new_height - original_height
new_img.paste(img, (0, y_offset), img if img.mode == 'RGBA' else None)

# Add a visible line at the very top (1 pixel line)
draw = ImageDraw.Draw(new_img)
draw.line([(0, 0), (new_width, 0)], fill=(255, 0, 0, 255), width=1)

# Save the modified image
new_img.save('/Users/zacbarnes/Desktop/Gamer/public/images/catan_boat.png')
print(f"New size: {new_width}x{new_height}")
print("Image updated successfully with extra empty space and red top pixel line!")
