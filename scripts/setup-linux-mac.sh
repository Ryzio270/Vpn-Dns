#!/usr/bin/env bash
set -e

echo "AdGuard DNS + NordVPN Auto-Toggle - Setup"
echo "=========================================="
echo ""

if ! command -v adb &>/dev/null; then
    echo "ERROR: ADB not found."
    echo ""
    echo "Install ADB:"
    echo "  macOS:  brew install android-platform-tools"
    echo "  Ubuntu: sudo apt install adb"
    echo "  Other:  https://developer.android.com/tools/releases/platform-tools"
    echo ""
    exit 1
fi

echo "ADB found. Make sure your phone is:"
echo "  1. Connected via USB"
echo "  2. USB debugging is enabled (Settings -> Developer options)"
echo "  3. You have tapped 'Allow' on the USB debugging prompt on your phone"
echo ""
read -rp "Press Enter when ready..."
echo ""

echo "Granting WRITE_SECURE_SETTINGS permission to MacroDroid..."
adb shell pm grant com.arlosoft.macrodroid android.permission.WRITE_SECURE_SETTINGS

echo ""
echo "Done! Permission granted successfully."
echo "You can now disconnect the USB cable."
echo ""
echo "Next: follow the MacroDroid setup steps in the README."
