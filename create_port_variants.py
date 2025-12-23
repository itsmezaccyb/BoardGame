#!/usr/bin/env python3
"""
Create variant boat images with resource logos and trade ratio text.
Generates images like: catan_boat_brick_2-1.png, catan_boat_wheat_2-1.png, etc.
"""

from PIL import Image, ImageDraw, ImageFont
import os

images_dir = '/Users/zacbarnes/Desktop/Gamer/public/images'

# Define port configurations
# Format: (boat_variant_name, logo_filename, trade_ratio_text)
port_configs = [
    ('brick_2-1', 'catan_brick_logo.png', '2:1'),
    ('sheep_2-1', 'catan_sheep_logo.png', '2:1'),
    ('rock_2-1', 'catan_rock_logo.png', '2:1'),
    ('wheat_2-1', 'catan_wheat_logo.png', '2:1'),
    ('wood_2-1', 'catan_wood_logo.png', '2:1'),
    ('generic_3-1', 'catan_generic_logo.png', '?'),  # Generic port with generic logo
]

def create_port_variant(boat_path, logo_path, trade_text, output_path, logo_scale=0.20):
    """
    Create a port boat variant with logo and trade ratio text.

    Args:
        boat_path: Path to base boat image
        logo_path: Path to logo image (or None for generic)
        trade_text: Text like "2:1" or "3:1"
        output_path: Path to save result
        logo_scale: Scale of logo relative to boat width (default 0.20 = 20%)
    """
    try:
        # Load boat image
        boat = Image.open(boat_path).convert('RGBA')
        boat_width, boat_height = boat.size

        print(f"Loading boat: {boat_width}x{boat_height}")

        # Create a copy to modify
        result = boat.copy()

        # Load and composite logo if provided
        if logo_path and os.path.exists(logo_path):
            logo = Image.open(logo_path).convert('RGBA')
            logo_width, logo_height = logo.size

            # Resize logo based on scale parameter
            logo_size = int(boat_width * logo_scale)
            logo_resized = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

            # Position logo in the boat (58% down from top, slightly to the right)
            logo_x = int((boat_width - logo_size) // 2 + 40)  # Slightly to the right
            # Generic logos go slightly lower
            if trade_text == '?':
                logo_y = int(boat_height * 0.59)  # Slightly lower for generic
            else:
                logo_y = int(boat_height * 0.58)  # Standard position for resource ports

            # Composite logo onto boat
            result.paste(logo_resized, (logo_x, logo_y), logo_resized)
            print(f"  Added logo at ({logo_x}, {logo_y}), size {logo_size}x{logo_size}")


        # Save the variant
        result.save(output_path, 'PNG')
        print(f"Saved: {output_path}\n")

    except Exception as e:
        print(f"Error creating variant: {e}\n")

def main():
    boat_path = os.path.join(images_dir, 'catan_boat.png')

    if not os.path.exists(boat_path):
        print(f"Error: {boat_path} not found!")
        return

    print("Creating port boat variants...\n")

    for config_name, logo_filename, trade_ratio in port_configs:
        output_filename = f'catan_boat_{config_name}.png'
        output_path = os.path.join(images_dir, output_filename)

        logo_path = os.path.join(images_dir, logo_filename) if logo_filename else None

        # Use slightly smaller scale for each logo type
        if config_name == 'brick_2-1':
            logo_scale = 0.20
        elif config_name == 'sheep_2-1':
            logo_scale = 0.195
        elif config_name == 'rock_2-1':
            logo_scale = 0.19
        elif config_name == 'wheat_2-1':
            logo_scale = 0.168
        elif config_name == 'wood_2-1':
            logo_scale = 0.18
        else:  # generic_3-1
            logo_scale = 0.151

        print(f"Creating: {output_filename}")
        create_port_variant(boat_path, logo_path, trade_ratio, output_path, logo_scale)

    print("Port variant creation complete!")

if __name__ == "__main__":
    main()
