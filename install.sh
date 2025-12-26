#!/bin/bash

# Messenger Notifier Applet Installer

APPLET_DIR="$HOME/.local/share/cinnamon/applets"
APPLET_NAME="messenger-notifier@laci"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing Messenger Notifier applet..."

# Create applets directory if it doesn't exist
mkdir -p "$APPLET_DIR"

# Remove existing installation if present
if [ -L "$APPLET_DIR/$APPLET_NAME" ]; then
    echo "Removing existing symlink..."
    rm "$APPLET_DIR/$APPLET_NAME"
elif [ -d "$APPLET_DIR/$APPLET_NAME" ]; then
    echo "Removing existing directory..."
    rm -rf "$APPLET_DIR/$APPLET_NAME"
fi

# Create symlink to the applet
ln -s "$SCRIPT_DIR/$APPLET_NAME" "$APPLET_DIR/$APPLET_NAME"

echo "✓ Applet installed to $APPLET_DIR/$APPLET_NAME"
echo ""
echo "To enable the applet:"
echo "1. Right-click on your Cinnamon panel"
echo "2. Select 'Applets'"
echo "3. Find 'Messenger Notifier' and click '+' to add it"
echo ""
echo "Or restart Cinnamon: Alt+F2 → type 'r' → Enter"
