#!/usr/bin/env python3
from PIL import Image

# Load current image
img = Image.open('/Users/zacbarnes/Desktop/Gamer/public/images/catan_boat.png')
original_width, original_height = img.size
print(f"Current size: {original_width}x{original_height}")

# Crop to just the boat portion (assume last 1024 pixels is the boat)
crop_height = 1024
boat_img = img.crop((0, original_height - crop_height, original_width, original_height))

# Create new image with more blank space above (50% of boat height)
blank_space = int(crop_height * 0.5)
new_height = crop_height + blank_space
new_width = original_width

new_img = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))

# Paste boat at bottom with blank space on top
new_img.paste(boat_img, (0, blank_space), boat_img)

# Save
new_img.save('/Users/zacbarnes/Desktop/Gamer/public/images/catan_boat.png')
print(f"New size: {new_width}x{new_height}")
print("Image saved with more blank space above!")
