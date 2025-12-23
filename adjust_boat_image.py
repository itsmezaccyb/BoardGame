#!/usr/bin/env python3
from PIL import Image, ImageDraw

# Load current image
img = Image.open('/Users/zacbarnes/Desktop/Gamer/public/images/catan_boat.png')
original_width, original_height = img.size
print(f"Current size: {original_width}x{original_height}")

# Crop to just the boat portion (remove most of the blank space)
# The boat appears to be in the bottom portion
crop_start = original_height - 1024
if crop_start < 0:
    crop_start = 0
boat_img = img.crop((0, crop_start, original_width, original_height))
boat_height = boat_img.size[1]

print(f"Boat portion height: {boat_height}")

# Create new image with moderate blank space above (20% of boat height)
blank_space = int(boat_height * 0.2)
new_height = boat_height + blank_space
new_width = original_width

new_img = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))

# Paste boat at bottom with blank space on top
new_img.paste(boat_img, (0, blank_space), boat_img)

# Save
new_img.save('/Users/zacbarnes/Desktop/Gamer/public/images/catan_boat.png')
print(f"New size: {new_width}x{new_height}")
print("Image saved with moderate blank space above!")
