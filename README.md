# `<html-editor>`

This is a web-component, lightweight, bare bones HTML editor that wraps the HTML in an `<iframe sandbox>` so that malicious scripts embedded in the HTML cannot execute in your page.

## Why another rich text editor?

I have a couple of restrictions:

* Must be compatible with web components and shadow DOM. 
* Must handle a wide variety of possibly dodgy HTML.
* Should work when imported as a module or asychronously brought into the page.
* Should be open source.

Unfortunately those rule out every HTML editor component I've been able to find. Shadow DOM means libraries that rely on `document...` methods (like the otherwise excellent [Quill](https://github.com/quilljs/quill)) can't work. Those that do work are too easy to inject `<script>` tags into, or need loading with the initial page, or rely on Regex to find XSS.

## How does it protect against XSS?

Like most HTML editors this uses `contenteditable` on the body of a new page in an `<iframe>` and [`document.execCommand`](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand) to provide functions like _Bold_ and _Italic_.

Where this differs is that the `<iframe>` is flagged with the [`sandbox="allow-scripts"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe) attribute. This allows scripts to run inside the `<iframe>`, but in their own unique origin - they can't execute anything in the context of the page that contains it, they can't POST, they can't resend cookies (no CSRF), they can't display dialogs, and they can't get out of the frame.

The problem with this `sandbox` is that it isn't easy for the parent page and the frame to communicate any more. So this uses [`postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) is used to send content and commands.

So when a _Bold_ command is executed the wrapper component uses `postMessage` to sent that to the `<iframe>`, and then in that page it picks up the message and calls `document.execCommand`. When the user inputs changes to the `contenteditable` body that uses `postMessage` to sent the changed HTML back up to the containing page.

## How do I use it?

This component consists of two web components:

* `<sandbox-editor>` stand alone HTML editor sandbox with no UI
* `<html-editor>` Polymer 2 UI, which depends on HTML imports and further Polymer components.

### `<sandbox-editor>`

Include the script in your page:

    <script type="module" src="{path}/html-editor/sandbox-editor.js"></script>
    
Include the tag in your HTML:

    <sandbox-editor content={{HTML content to edit}}>
         Custom toolbar buttons here
    </sandbox-editor>
    
The `content` attribute (it can also be set as a property) holds the HTML to set. `content-changed` fires when the user updates the HTML. This is compatible with [Polymer's `notify` properties](https://www.polymer-project.org/2.0/docs/devguide/properties), so you can use its two-way binding.

To execute commands against the editor call `editorAction`:

    const sandbox = parentElement.querySelector('sandbox-editor');
    sandbox.editorAction('bold'); // make the current selection bold
    sandbox.editorAction('backColor', '#fdb5fb'); // make the background pink

For an example of this see the [source of `<html-editor>`](html-editor.html)

### `<html-editor>`

Include the HTML import:

    <link rel="import" href="{path}/html-editor/html-editor.html" />

Include the tag in your HTML:

    <html-editor content={{HTML content to edit}}></html-editor>

The `content` attribute (it can also be set as a property) holds the HTML to set, Polymer two-way databinding is supported.

![screen shot](demo/html-editor.png)
