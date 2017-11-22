# `<html-editor>`

This is a lightweight, bare bones HTML editor that wraps the HTML in an `<iframe sandbox>` so that malicious scripts embedded in the HTML cannot execute in your page.

Scripts are allowed to run, but appear as a different origin, cannot POST, cannot open dialogs or run anything outside of the frame.

[`postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) is used to send content and commands.