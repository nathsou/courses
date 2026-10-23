---
number: C
title: Setting up MIDI
summary: Devices, browsers, USB and Bluetooth, latency and troubleshooting.
duration: 10 minutes
---

The course listens to your keyboard through **Web MIDI**, a browser feature that lets a page receive the
messages a MIDI keyboard sends: a key went down (which one, how hard), a key came up, the sustain pedal moved.
:cite[webmidi,midi-1983] It never receives sound, so the course works the same whether your instrument plays
through its own speakers, headphones or not at all.

::instrument-setup

## Browsers

| Browser | MIDI keyboards |
| --- | --- |
| Chrome, Edge, Opera and other Chromium browsers (Windows, macOS, Linux, Android) | Yes |
| Firefox (Windows, macOS, Linux) | Yes, after a permission prompt |
| Safari (macOS) | No |
| Any browser on iPhone or iPad | No |

Where MIDI is not available, the keyboard on the page (click or touch it) and your computer keyboard
(:kbd[A] :kbd[W] :kbd[S] :kbd[E] :kbd[D] … from :n[C4]; :kbd[Z] and :kbd[X] change octave) do everything a
MIDI keyboard does, except play more than a few keys at once.

## Connecting

- **USB.** Most digital pianos made in the last fifteen years have a USB port marked *USB to Host* or
  *Computer*. Connect it to the computer with the right cable; no driver is needed on current systems.
- **Bluetooth.** Pair the instrument in your operating system’s Bluetooth or Audio MIDI settings first; it then
  appears to the browser like a USB device.
- **Older instruments** with round five-pin *MIDI Out* sockets need a USB MIDI interface between the
  instrument and the computer.

Once connected, press **Connect a MIDI keyboard** above. The first time, the browser asks whether this page
may use MIDI devices. If you said no by mistake, allow it again in the site settings (the icon to the left of
the address) and reload the page.

## When nothing arrives

1. Check that the panel above names your instrument. If it says no keyboard is connected, unplug it and plug
   it back in: it should appear without a reload.
2. If more than one input is listed, choose your instrument rather than *Every connected input*.
3. Some instruments send MIDI only when *Local control* or a *MIDI out* option is set in their own menus; see
   your instrument’s manual.
4. Close other programs that use the keyboard (a DAW or a lesson app): on Windows, only one program can open
   a USB MIDI device at a time.

## Sound and latency

By default the course does not play the notes you send from a MIDI keyboard: your instrument makes its own
sound, and doubling it through the computer’s speakers would add an echo. Switch on *Also play my MIDI keys
through the course piano* if your keyboard has no speakers.

The course piano is the Salamander Grand Piano, a Yamaha C5 recorded by Alexander Holm and released under a
Creative Commons Attribution licence; the course uses a small subset of it. :cite[salamander] The tap-along in
the [prologue](/chapters/four-chords/#tap-along) measures how long your system takes between a click and your
key; rhythm exercises allow for it.
