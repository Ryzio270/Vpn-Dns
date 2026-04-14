# AdGuard DNS + NordVPN Auto-Toggle

Automatically enables Android's Private DNS (pointed at AdGuard) when NordVPN connects, and disables it when NordVPN disconnects — so the AdGuard app's own DNS protection can take back over.

## How it works

| State | Private DNS | DNS handled by |
|---|---|---|
| NordVPN **off** | Off | AdGuard app (local VPN) |
| NordVPN **on** | `dns.adguard-dns.com` | AdGuard servers (DoT) |

NordVPN's tunnel conflicts with AdGuard's local VPN, so we fall back to AdGuard's public DNS-over-TLS server whenever NordVPN is active. Two MacroDroid macros detect the VPN state change and flip the setting automatically.

---

## Requirements

- Android phone with NordVPN and AdGuard apps installed
- [MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid) (free) installed on your phone
- A PC with ADB installed (only needed once for setup)

---

## Setup

### Step 1 — Grant MacroDroid the DNS permission (PC, one time only)

MacroDroid needs the `WRITE_SECURE_SETTINGS` permission to change your Private DNS setting. Android doesn't allow apps to request this normally, so you grant it once via ADB from your PC.

**Enable USB debugging on your phone first:**
Settings → About phone → tap Build number 7 times → go back to Settings → Developer options → enable USB debugging.

Then connect your phone to your PC via USB and run the appropriate script from this repo:

- **Windows:** double-click `scripts/setup-windows.bat`
- **Linux / macOS:** run `bash scripts/setup-linux-mac.sh` in a terminal

Or run the command directly:
```
adb shell pm grant com.arlosoft.macrodroid android.permission.WRITE_SECURE_SETTINGS
```

You should see no output (silence = success). After this, you can disconnect the USB cable — it's never needed again.

---

### Step 2 — Create the "VPN ON" macro in MacroDroid

This macro enables AdGuard Private DNS when NordVPN connects.

1. Open MacroDroid → tap the **+** button to create a new macro
2. Name it: `NordVPN ON: Enable AdGuard DNS`

**Add a Trigger:**
- Tap **Triggers** → **Add Trigger**
- Select **Connectivity** → **VPN State**
- Choose **VPN Enabled** → tap OK

**Add an Action:**
- Tap **Actions** → **Add Action**
- Select **Code** → **Run Shell Script**
- Paste in the following and tap OK:
  ```
  settings put global private_dns_mode hostname
  settings put global private_dns_specifier dns.adguard-dns.com
  ```
- Leave "Use Root" **unchecked** (the ADB permission handles this)

**(Optional) Add a notification so you can see it working:**
- Tap **Add Action** → **Notifications** → **Toast Message**
- Message: `AdGuard DNS enabled`

3. Tap the tick/checkmark to save the macro and make sure it is **enabled** (toggle is on).

---

### Step 3 — Create the "VPN OFF" macro in MacroDroid

This macro turns Private DNS back off when NordVPN disconnects, letting the AdGuard app resume its own DNS handling.

1. Open MacroDroid → tap **+** to create a new macro
2. Name it: `NordVPN OFF: Disable AdGuard DNS`

**Add a Trigger:**
- Tap **Triggers** → **Add Trigger**
- Select **Connectivity** → **VPN State**
- Choose **VPN Disabled** → tap OK

**Add an Action:**
- Tap **Actions** → **Add Action**
- Select **Code** → **Run Shell Script**
- Paste in the following and tap OK:
  ```
  settings put global private_dns_mode off
  ```

**(Optional) Add a notification:**
- Tap **Add Action** → **Notifications** → **Toast Message**
- Message: `AdGuard DNS disabled`

3. Save and make sure the macro is **enabled**.

---

### Step 4 — Test it

1. Connect NordVPN on your phone.
2. Go to **Settings → Network & internet → Private DNS** — it should show `dns.adguard-dns.com`.
3. Disconnect NordVPN.
4. Check **Settings → Network & internet → Private DNS** again — it should show **Off**.
5. Open the AdGuard app — its DNS protection indicator should be active again.

---

## Troubleshooting

**Shell script action does nothing / Private DNS doesn't change**
The WRITE_SECURE_SETTINGS permission wasn't granted (or was revoked after a factory reset or system update). Reconnect your phone to your PC and re-run the setup script.

**Macros don't fire at all**
- Make sure both macros are enabled (green toggle in MacroDroid).
- Check MacroDroid isn't being killed by battery optimisation: Settings → Battery → App battery usage → MacroDroid → **Unrestricted**.

**VPN connects but NordVPN isn't detected**
MacroDroid's VPN State trigger detects any standard Android VPN. If NordVPN isn't triggering it, try toggling the macro off and on, or reinstalling MacroDroid.

**I have a custom AdGuard DNS profile (personalised filtering)**
If you've set up a private AdGuard DNS profile (via adguard-dns.io), replace `dns.adguard-dns.com` in the shell script with your personal DNS-over-TLS hostname — it will look something like `abcdef12.dns.adguard-dns.com`.

---

## Shell commands reference

```bash
# Enable AdGuard DNS (default, blocks ads + trackers)
settings put global private_dns_mode hostname
settings put global private_dns_specifier dns.adguard-dns.com

# Disable Private DNS
settings put global private_dns_mode off

# Check current state
settings get global private_dns_mode
settings get global private_dns_specifier
```
