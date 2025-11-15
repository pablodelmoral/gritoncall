# Background Image Issue

## Problem
The background image (bg.png) appears too large on mobile screens because it's designed at a very high resolution.

## Current Settings
- Opacity: 100% (1.0)
- ResizeMode: center (shows image at actual size)

## Solution Options

### Option 1: Use a smaller image
The image needs to be optimized for mobile screens. Recommended size:
- Width: 375-428px (typical phone width)
- Height: 667-926px (typical phone height)
- File size: < 200KB

### Option 2: If you want the pattern to tile
Use `resizeMode="repeat"` but the image should be a small tile (like 200x200px)

### Option 3: Current workaround
Using `resizeMode="center"` shows the image at its actual pixel size.
If it's too big, the image file itself needs to be resized.

## Recommendation
Please provide a mobile-optimized version of the background:
- Resize the image to phone screen dimensions
- Or provide a small tileable pattern
