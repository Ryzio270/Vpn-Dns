@echo off
echo AdGuard DNS + NordVPN Auto-Toggle - Setup
echo ==========================================
echo.

where adb >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: ADB not found.
    echo.
    echo Install ADB from: https://developer.android.com/tools/releases/platform-tools
    echo Extract the zip, add the folder to your PATH, then run this script again.
    echo.
    pause
    exit /b 1
)

echo ADB found. Make sure your phone is:
echo   1. Connected via USB
echo   2. USB debugging is enabled ^(Settings -^> Developer options^)
echo   3. You have tapped "Allow" on the USB debugging prompt on your phone
echo.
pause

echo.
echo Granting WRITE_SECURE_SETTINGS permission to MacroDroid...
adb shell pm grant com.arlosoft.macrodroid android.permission.WRITE_SECURE_SETTINGS

if %ERRORLEVEL% equ 0 (
    echo.
    echo Done! Permission granted successfully.
    echo You can now disconnect the USB cable.
    echo.
    echo Next: follow the MacroDroid setup steps in the README.
) else (
    echo.
    echo ERROR: Something went wrong. Check that:
    echo   - Your phone is connected and USB debugging is authorised
    echo   - MacroDroid is installed on your phone
    echo   - You tapped "Allow" on the USB debugging dialog
)

echo.
pause
