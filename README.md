# Messenger Notifier for Cinnamon

A Cinnamon desktop applet + Tampermonkey userscript that shows Facebook Messenger unread status in your system tray.

## Why This Project?

[Caprine](https://github.com/sindresorhus/caprine) was a popular Electron-based Messenger client, but it is now unmaintained and buggy. This project provides a lightweight alternative that:

- Uses the official Messenger web app (messenger.com) directly in Chrome
- Provides the same tray icon functionality as Caprine (using Caprine's detection method and icons)
- Is more reliable since it doesn't depend on Electron wrapper quirks
- Correctly ignores muted conversations (just like Caprine)

**Recommended setup:** Run Messenger as a Chrome app with extensions enabled:

```bash
google-chrome --app=https://messenger.com --enable-extensions
```

This gives you a clean, standalone Messenger window with Tampermonkey support for the userscript.

## Components

1. **Cinnamon Applet** - Displays the Messenger icon in your panel with read/unread status
2. **Tampermonkey Userscript** - Monitors messenger.com for unread messages and updates the applet

## Installation

### 1. Install the Cinnamon Applet

```bash
# Clone the repository
git clone https://github.com/user/cinnamon-messenger-notifier.git
cd cinnamon-messenger-notifier

# Run the install script (creates symlink)
./install.sh

# Or manually:
ln -s "$(pwd)/messenger-notifier@laci" ~/.local/share/cinnamon/applets/
```

Then enable the applet:
1. Right-click on your Cinnamon panel → "Applets"
2. Find "Messenger Notifier" and click "+" to add it
3. Or restart Cinnamon: `Alt+F2` → `r` → Enter

### 2. Install the Tampermonkey Userscript

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Open Tampermonkey Dashboard → Create new script
3. Copy the contents of `messenger-notifier.user.js` and save
4. Make sure the script is enabled

### 3. Open Messenger as a Web App

For the best experience, run Messenger as a standalone Chrome app:

```bash
google-chrome --app=https://messenger.com --enable-extensions
```

You can create a desktop shortcut for this command.

## How It Works

The userscript uses the same detection method as Caprine:
- Monitors `aria-label` attributes on the Messenger sidebar icons
- These labels contain unread counts that automatically exclude muted conversations
- When unread messages are detected, it calls the applet's REST API to update the tray icon

## Features

- **Accurate Detection**: Uses Caprine's proven method for detecting unread messages
- **Muted Conversations**: Correctly ignores muted conversations (no false notifications)
- **Real-time Updates**: Uses MutationObserver for instant detection
- **Debounced Status**: Prevents icon flickering with smart debouncing
- **Click to Toggle**: Click the applet to manually toggle read/unread state

## REST API

The applet exposes a local HTTP server on port 33333.

### Set Icon Status

```bash
# Set to read (grayscale icon)
curl "http://localhost:33333/set-messenger-icon?status=read"

# Set to unread (colored icon)
curl "http://localhost:33333/set-messenger-icon?status=unread"
```

### Get Current Status

```bash
curl "http://localhost:33333/status"
```

## File Structure

```
cinnamon-messenger-notifier/
├── README.md
├── install.sh                    # Installation script
├── messenger-notifier.user.js    # Tampermonkey userscript
└── messenger-notifier@laci/      # Cinnamon applet
    ├── metadata.json
    ├── applet.js
    └── icons/
        ├── messenger-colored.png    # Unread icon (from Caprine)
        └── messenger-grayscale.png  # Read icon (from Caprine)
```

## Troubleshooting

### Applet not appearing
- Ensure the applet is in `~/.local/share/cinnamon/applets/`
- Restart Cinnamon: `Alt+F2` → `r` → Enter
- Check logs: `cat ~/.xsession-errors | grep messenger`

### Userscript not working
- Make sure you're on `messenger.com` (not `facebook.com/messages`)
- Check browser console for `[Messenger Notifier]` log messages
- Verify Tampermonkey shows the script as active on the page

### Server returning 500 errors
- Restart Cinnamon to reload the applet
- Check logs: `cat ~/.xsession-errors | grep messenger`

### Icon not updating
- Test the API directly: `curl "http://localhost:33333/set-messenger-icon?status=unread"`
- Check if the userscript is detecting unread messages (look for console logs)

## Credits

- Tray icons from [Caprine](https://github.com/sindresorhus/caprine) by Sindre Sorhus
- Unread detection method inspired by Caprine's implementation

## License

MIT License
