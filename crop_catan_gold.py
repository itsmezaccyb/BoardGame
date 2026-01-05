from PIL import Image
import numpy as np

def crop_white_border(image_path, output_path=None, white_threshold=240, padding=5):
    """
    Crop white border from an image.

    Args:
        image_path: Path to input image
        output_path: Path for output image (optional, defaults to input_path + '_cropped')
        white_threshold: Minimum RGB value to consider as white (0-255)
        padding: Pixels of padding to keep around the cropped content
    """
    # Open the image
    img = Image.open(image_path)

    # Convert to RGB if necessary
    if img.mode != 'RGB':
        img = img.convert('RGB')

    # Get image data as numpy array
    img_array = np.array(img)

    # Find non-white pixels
    mask = np.all(img_array >= white_threshold, axis=2)

    # Find bounding box of non-white content
    rows = np.any(~mask, axis=1)
    cols = np.any(~mask, axis=0)

    if np.any(rows) and np.any(cols):
        ymin, ymax = np.where(rows)[0][[0, -1]]
        xmin, xmax = np.where(cols)[0][[0, -1]]

        # Add padding
        ymin = max(0, ymin - padding)
        ymax = min(img.height - 1, ymax + padding)
        xmin = max(0, xmin - padding)
        xmax = min(img.width - 1, xmax + padding)

        # Crop the image
        cropped = img.crop((xmin, ymin, xmax + 1, ymax + 1))

        # Generate output path if not provided
        if output_path is None:
            base_name = image_path.rsplit('.', 1)[0]
            extension = image_path.rsplit('.', 1)[1]
            output_path = f"{base_name}_cropped.{extension}"

        # Save the cropped image
        if extension.lower() in ['jpg', 'jpeg']:
            cropped.save(output_path, 'JPEG', quality=95)
        else:
            cropped.save(output_path)

        print(f"Original size: {img.size}")
        print(f"Cropped size: {cropped.size}")
        print(f"Saved to: {output_path}")
        return True
    else:
        print("No non-white content found to crop")
        return False

if __name__ == "__main__":
    # Crop the catan gold image
    crop_white_border('public/images/catan_gold.jpg')
