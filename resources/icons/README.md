# App Icons

## Required Icons

For the application to work properly, you need to create the following icon files:

### Tray Icon
- `icon.png` - 16x16 or 32x32 PNG for system tray (Windows/Linux)
- `icon.ico` - Windows ICO format
- `icon.icns` - macOS ICNS format

### Creating Icons

You can use tools like:
- [Electron Icon Builder](https://www.electronjs.org/docs/latest/api/native-image)
- [Icon converters](https://cloudconvert.com/png-to-ico)
- Design tools like Figma, Sketch, or GIMP

### Default Icon

The application uses a programmatically generated icon if no icon file is found.
For production, replace with properly designed icons.

### Icon Specifications

**Tray Icon (icon.png)**
- Size: 16x16 (standard), 32x32 (high-DPI)
- Format: PNG with transparency
- Color: Should match app branding

**App Icon (icon.ico / icon.icns)**
- Multiple sizes: 16, 32, 48, 64, 128, 256, 512
- Format: ICO for Windows, ICNS for macOS

## Programmatic Icon Generation

If no icon files are present, the application generates a simple circular icon programmatically using Electron's `nativeImage` API. This is implemented in [`electron/tray.ts`](../../electron/tray.ts:9):

```typescript
// Creates a 16x16 indigo-colored circle icon
function createTrayIcon(): Electron.NativeImage {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 1;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      if (dist <= radius) {
        // Primary color (indigo)
        canvas[idx] = 99;     // R
        canvas[idx + 1] = 102; // G
        canvas[idx + 2] = 241; // B
        canvas[idx + 3] = 255; // A
      }
    }
  }
  
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}
```

## Platform-Specific Notes

### Windows
- ICO format required for taskbar/tray
- Recommended sizes in ICO: 16, 24, 32, 48, 64, 128, 256

### macOS
- ICNS format required
- Template images (black with transparency) are preferred for menu bar
- Use `icon.icns` for dock and `iconTemplate.png` for menu bar

### Linux
- PNG format works for most desktop environments
- Place multiple sizes in the icons folder
- Electron will select the appropriate size automatically

## Building Icons

Use [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) to generate all required formats:

```bash
npx electron-icon-builder --input=./icon-source.png --output=./resources/icons
```

This will generate:
- `icon.icns` - macOS
- `icon.ico` - Windows
- Various PNG sizes for Linux