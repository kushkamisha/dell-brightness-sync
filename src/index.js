#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getDisplays() {
  try {
    const { stdout } = await execAsync('m1ddc display list');

    let externalDisplayId = null;

    const lines = stdout.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const match = line.match(/^\[(\d+)\]\s+(.*?)\s+\(/);
      if (match) {
        const id = match[1];
        const name = match[2].trim();

        if (name.toLowerCase().includes('dell')) {
          externalDisplayId = id;
        }
      }
    }

    // Fallback if not specifically named dell but a display exists
    if (!externalDisplayId && stdout.includes('[1]')) {
      externalDisplayId = '1';
    }

    return { externalDisplayId };
  } catch (err) {
    console.error('Failed to list displays:', err);
    return { externalDisplayId: null };
  }
}

async function getInternalBrightness() {
  try {
    const { stdout } = await execAsync('/usr/libexec/corebrightnessdiag status-info');
    const match = stdout.match(/<key>DisplayServicesBrightness<\/key>\s*<(?:real|integer)>([0-9.]+)<\/(?:real|integer)>/);
    if (match) {
      const val = parseFloat(match[1]);
      return isNaN(val) ? null : Math.round(val * 100);
    }
    return null;
  } catch (err) {
    console.error('Failed to read internal brightness:', err);
    return null;
  }
}

async function getExternalBrightness(displayId) {
  try {
    const { stdout } = await execAsync(`m1ddc display ${displayId} get luminance`);
    const val = parseInt(stdout.trim(), 10);
    return isNaN(val) ? null : val;
  } catch (err) {
    return null;
  }
}

async function setBrightness(displayId, value) {
  value = Math.max(0, Math.min(100, Math.round(value))); // Clamp 0-100
  try {
    await execAsync(`m1ddc display ${displayId} set luminance ${value}`);
  } catch (err) {
    console.error(`Failed to set brightness for display ${displayId}:`, err);
  }
}

// Ensure smooth scaling between values
async function easeBrightness(displayId, startValue, endValue, durationMs = 1500) {
  if (startValue === endValue) return;

  const steps = 15;
  const interval = durationMs / steps;
  let currentStep = 0;

  return new Promise((resolve) => {
    const timer = setInterval(async () => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease out quad: starts fast, slows down at the end
      const easeOutProgress = 1 - Math.pow(1 - progress, 2);
      const currentValue = startValue + (endValue - startValue) * easeOutProgress;

      await setBrightness(displayId, currentValue);

      if (currentStep >= steps) {
        clearInterval(timer);
        resolve();
      }
    }, interval);
  });
}

async function main() {
  const { externalDisplayId } = await getDisplays();

  if (!externalDisplayId) {
    console.error("Could not find an external DDC display.");
    process.exit(1);
  }

  console.log(`Found External Dell [ID: ${externalDisplayId}]`);

  // Read internal display and set external immediately without easing to sync initially
  let lastKnownInternalBrightness = await getInternalBrightness();
  if (lastKnownInternalBrightness !== null) {
    console.log(`Initial built-in brightness is ${lastKnownInternalBrightness}%. Syncing to Dell...`);
    await setBrightness(externalDisplayId, lastKnownInternalBrightness);
  } else {
    console.log("Warning: Could not read internal brightness.");
  }

  let isTransitioning = false;

  console.log("Polling for brightness changes every 1 second...");

  // Polling Loop
  setInterval(async () => {
    if (isTransitioning) return; // Wait for current transition to finish

    const currentInternalBrightness = await getInternalBrightness();

    if (currentInternalBrightness !== null && lastKnownInternalBrightness !== null) {
      if (Math.abs(currentInternalBrightness - lastKnownInternalBrightness) > 1) {
        console.log(`Detected brightness change: ${lastKnownInternalBrightness}% -> ${currentInternalBrightness}%. Synchronizing...`);

        isTransitioning = true;
        const startBrightness = await getExternalBrightness(externalDisplayId) || lastKnownInternalBrightness;

        // We take about 1.5 seconds to fade it to the new target
        await easeBrightness(externalDisplayId, startBrightness, currentInternalBrightness, 1500);

        lastKnownInternalBrightness = currentInternalBrightness;
        isTransitioning = false;
      }
    } else if (currentInternalBrightness !== null && lastKnownInternalBrightness === null) {
      lastKnownInternalBrightness = currentInternalBrightness;
    }
  }, 1000);
}

main().catch(console.error);
