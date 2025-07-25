#!/usr/bin/env python3
"""
Background removal script using rembg library
This script provides a free alternative to paid APIs
"""

import sys
import os
from io import BytesIO
import base64

try:
    from rembg import remove
    from PIL import Image
except ImportError:
    print("Error: Required packages not installed.")
    print("Please run: pip install rembg pillow")
    sys.exit(1)

def remove_background(input_path, output_path=None):
    """
    Remove background from an image
    
    Args:
        input_path: Path to input image or base64 string
        output_path: Path to save output image (optional)
    
    Returns:
        Base64 encoded image if no output_path, else saves to file
    """
    try:
        # Check if input is base64 string
        if input_path.startswith('data:image'):
            # Extract base64 data
            header, encoded = input_path.split(',', 1)
            image_data = base64.b64decode(encoded)
            input_image = Image.open(BytesIO(image_data))
        else:
            # Read from file path
            with open(input_path, 'rb') as f:
                input_image = f.read()
        
        # Remove background
        if isinstance(input_image, Image.Image):
            # Convert PIL Image to bytes
            img_byte_arr = BytesIO()
            input_image.save(img_byte_arr, format='PNG')
            input_bytes = img_byte_arr.getvalue()
        else:
            input_bytes = input_image
            
        output_bytes = remove(input_bytes)
        
        if output_path:
            # Save to file
            with open(output_path, 'wb') as f:
                f.write(output_bytes)
            return output_path
        else:
            # Return as base64
            output_base64 = base64.b64encode(output_bytes).decode('utf-8')
            return f"data:image/png;base64,{output_base64}"
            
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return None

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python remove_bg.py <input_image> [output_image]")
        print("   or: echo <base64_image> | python remove_bg.py --stdin")
        print("")
        print("Examples:")
        print("  python remove_bg.py image.jpg")
        print("  python remove_bg.py image.jpg output.png")
        print("  echo 'data:image/jpeg;base64,/9j/4AA...' | python remove_bg.py --stdin")
        sys.exit(1)
    
    if sys.argv[1] in ['--help', '-h']:
        print("Background Remover using rembg")
        print("")
        print("Usage: python remove_bg.py <input_image> [output_image]")
        print("   or: echo <base64_image> | python remove_bg.py --stdin")
        print("")
        print("Arguments:")
        print("  input_image    Path to input image file")
        print("  output_image   Path to save output image (optional)")
        print("  --stdin        Read base64 image data from stdin")
        print("")
        print("Examples:")
        print("  python remove_bg.py image.jpg")
        print("  python remove_bg.py image.jpg output.png")
        print("  echo 'data:image/jpeg;base64,/9j/4AA...' | python remove_bg.py --stdin")
        sys.exit(0)
    
    if sys.argv[1] == "--stdin":
        # Read base64 from stdin
        input_data = sys.stdin.read().strip()
        result = remove_background(input_data)
        if result:
            print(result)
    else:
        # File input
        input_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else None
        
        if not os.path.exists(input_path):
            print(f"Error: Input file '{input_path}' not found.")
            sys.exit(1)
        
        if not output_path:
            # Generate output filename
            name, ext = os.path.splitext(input_path)
            output_path = f"{name}_no_bg.png"
        
        result = remove_background(input_path, output_path)
        if result:
            print(f"Background removed successfully. Output: {result}")
        else:
            print("Failed to remove background.")
            sys.exit(1)

if __name__ == "__main__":
    main()
