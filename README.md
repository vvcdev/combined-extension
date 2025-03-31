# Tab & Drive Assistant Plus

A Chrome/Edge extension that combines three powerful features:
1. Quick tab switching between current and last active tab
2. Google Drive shortcuts for accessing different user accounts
3. Edge Cut Fix to prevent interference with text selection

## Features

### Tab Switching
- Switch between the current tab and the last active tab using `Alt+Q`
- Persistent tab tracking even after browser restart
- Automatic fallback options if tabs are closed

### Google Drive Shortcuts
- Access Google Drive accounts with keyboard shortcuts
- No popup interface or visual elements
- Predefined shortcuts for two different Google accounts:
  - `Ctrl+Shift+1` - Opens Google Drive Recent Files for Account 0
  - `Ctrl+Shift+2` - Opens Google Drive Recent Files for Account 3

### Edge Cut Fix
- Prevents Microsoft Edge's Cut feature from interfering with text selection
- Makes text selection behave like in other browsers
- Runs automatically on all web pages
- No configuration needed - just works in the background

## Installation

1. Download or clone the repository
2. Open Edge and navigate to `edge://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click on "Load unpacked" and select the extension directory

## Customizing Shortcuts

1. After installing the extension, go to `edge://extensions/`
2. Scroll to the bottom and click "Keyboard shortcuts"
3. Customize the keyboard combinations for each command

## How It Works

The extension combines three key functionalities:

### Tab Switching
- Tracks your currently active tab and previously active tab
- Persists this information even if you restart your browser
- Handles cases where tabs might be closed or no longer exist
- Provides fallback options to ensure Alt+Q always performs a tab switch

### Google Drive Shortcuts
- Creates new tabs with specific Google Drive URLs
- Supports different user accounts with distinct keyboard shortcuts

### Edge Cut Fix
- Intercepts mouse events that might trigger Edge's Cut feature
- Preserves text selection behavior as expected in standard browsers
- Only activates in Microsoft Edge browser
- Uses event capturing to handle events before Edge's built-in handlers

## Project Structure

```
combined-extension
├── manifest.json        # Configuration with keyboard shortcuts and permissions
├── background.js        # Background script for tab switching and drive shortcuts
├── edge-cut-fix.js      # Content script to fix Edge Cut behavior
├── icon
│   ├── icon16.png       # 16x16 pixel icon
│   ├── icon48.png       # 48x48 pixel icon
│   └── icon128.png      # 128x128 pixel icon
└── README.md            # Documentation
```

## License

This project is licensed under the MIT License.
