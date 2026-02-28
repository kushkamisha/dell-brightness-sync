# Dell Monitor Brightness Sync

## TL;DR Automatic Setup
Just want it to work instantly? Run this script in your terminal to automatically install prerequisites, the package globally, and set it up to run in the background forever using PM2:

```bash
bash <(curl -sL https://raw.githubusercontent.com/kushkamisha/dell-brightness-sync/main/install.sh)
```

## Overview

A lightweight, **zero-dependency** Node.js CLI tool that automatically synchronizes the brightness of your external Dell monitor with your MacBook's built-in display. Built specifically for Apple Silicon Macs.

It runs quietly in the background, checking your built-in screen's brightness. When you adjust your MacBook's brightness using the keyboard, the external monitor will smoothly transition to match it!

## Prerequisites

This tool relies on macOS's native `corebrightnessdiag` for sensing the built-in display and `m1ddc` for controlling the Dell display via hardware DDC/CI commands.

1. **Apple Silicon Mac** (M1/M2/M3/M4)
2. **[Homebrew](https://brew.sh/)** installed
3. **m1ddc** installed via Homebrew:
   ```bash
   brew install m1ddc
   ```

## Manual Installation

You can run this directly without installing it globally, or install it on your system for continuous background use.

### Option 1: Run via npx (No install required)
```bash
npx @mkushka/dell-brightness-sync
```

### Option 2: Install Globally
```bash
npm install -g @mkushka/dell-brightness-sync
```
Then run simply:
```bash
dell-brightness-sync
```

## Manual Background Daemon Setup (PM2)

If you didn't use the TL;DR script, we recommend using PM2 to keep it running silently at all times:

```bash
# Start the background sync daemon
npx pm2 start dell-brightness-sync --name "dell-brightness-sync"

# Stop the daemon
npx pm2 stop dell-brightness-sync

# Make it auto-start whenever your Mac reboots
npx pm2 startup && npx pm2 save
```

## How It Works

1. Identifies your external Dell monitor via `m1ddc` display lists.
2. Polls your internal Mac screen's real brightness directly from Apple's `/usr/libexec/corebrightnessdiag` sensor every 1 second.
3. Automatically triggers a smooth, non-jarring easing transition to fade your external Dell screen brightness to perfectly match the internal screen.

## Testing

Due to the script's heavy dependency on direct local macOS hardware communication and connected physical displays, automated CI tests are not practical. The recommended testing methodology is manual execution. A smoke test is provided to verify code syntax:
```bash
npm test
```

## License

MIT
