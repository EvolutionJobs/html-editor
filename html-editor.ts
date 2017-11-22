const stack = (new Error().stack || '').split('at'); // Get the current script path https://stackoverflow.com/questions/47437878/get-the-path-to-the-current-js-web-component
const scriptPath = stack[stack.length - 1].trim();
const componentPath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));

/** The properties of the dispatched message from Window.postMessage */
interface PostMessageEvent {
    /** The object passed from the other window. */
    data: any;

    /** The origin of the window that sent the message at the time postMessage was called.  */
    origin: string;

    /** A reference to the window object that sent the message; you can use this to establish two-way communication between two windows with different origins. */
    source: Window;
}

/** Bare bones HTML content editor that uses a sandboxed iframe to protect users */
export class HtmlEditor extends HTMLElement {

    /** Holds the content sent to the sandboxed iframe. */
    private _content: string;

    /** Holds the sandboxed iframe with the editable content. */
    private editor: HTMLIFrameElement;

    /** Get or set the editor content. */
    get content(): string { return this._content; };
    set content(c: string) {
        this._content = c;

        // If we have an editor send the command to update the HTML.
        if (this.editor)
            this.sendCommand('html', false, this._content);
    };

    static get observedAttributes() { return ['content']; }

    attributeChangedCallback(attr: string, oldValue: any, newValue: any) {
        (this as any)[attr] = newValue;
    }

    /** Send a command to the sandboxed iframe.
     * @param command The command to send.
     * @param focus Whether to give the iframe focus after the action (should be true for user actions, false otherwise).
     * @param content Optional additional content to send with the command.
     * @returns True if the message was sent to the iframe. */
    private sendCommand(command: string, focus: boolean, content?: any): boolean {
        if (!this.editor)
            return false;

        // As sandboxed the target window will not appear to have an origin
        this.editor.contentWindow.postMessage({ command, content }, '*');

        if (focus)
            this.editor.contentWindow.focus();

        return true;
    }

    /** Execute an editor action against the sandboxed content.
     * @param action Name of action from https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand */
    editorAction(action: string) {
        this.sendCommand(action, true);
    }

    private static readonly buttons: { action: string, text: string }[] = [
        { action: 'undo', text: 'undo' },
        { action: 'bold', text: 'B' },
        { action: 'italic', text: 'I' },
        { action: 'underline', text: 'U' },
        { action: 'insertOrderedList', text: 'OL' },
        { action: 'insertUnorderedList', text: 'UL' },
        { action: 'indent', text: '>' },
        { action: 'outdent', text: '<' },
        { action: 'justifyCenter', text: 'center' },
        { action: 'justifyFull', text: 'justify' },
        { action: 'justifyLeft', text: 'left' },
        { action: 'justifyRight', text: 'right' }
    ];

    /** When a message is received and the event source is the editor iframe then sync the content and fire the notification event. 
     * @param event The event holding the message details. */
    private receiveMessage(event: PostMessageEvent) {
        // We only care about events from our window
        if (this.editor && event.source === this.editor.contentWindow) {
            this._content = event.data.html;

            // Fire the notify event expected by Polymer for 2-way data binding
            this.dispatchEvent(new CustomEvent('content-changed', { detail: { value: this._content } }));
        }
    }

    connectedCallback() {
        if (this.editor)
            return;

        const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.innerHTML = `
:host { 
    display:block; 
    position: relative; 
}

iframe { 
    border: none; 
    margin: 0; 
    padding: 0; 
    width: 100%; 
    height: 100%; 
}

#toolbar {
    position: absolute;
    bottom: 0;
    background-color: var(--html-editor-background-colour, #fff);
    color: var(--html-editor-colour, #000);
    padding: .5em;
    box-shadow: rgba(0, 0, 0, 0.14) 0px -2px 2px 0px, rgba(0, 0, 0, 0.12) 0px -1px 5px 0px, rgba(0, 0, 0, 0.2) 0px -3px 1px -2px;
}

/* Override lots of <button> weirdness back to defaults */
button {
    position: relative;
    display: inline-block;
    margin: 0;
    padding: 0 .5em;
    text-align: left;
    outline-width: 0;
    border: 0;
    background: none;
    font-family: var(--font-main);
    font-size: 1rem;
    color: var(--html-editor-colour, #000);
    cursor: pointer;
}`;
        root.appendChild(style);

        const toolbar = document.createElement('div');
        toolbar.id = 'toolbar';
        root.appendChild(toolbar);

        for (const b of HtmlEditor.buttons) {
            const button = document.createElement('button');
            button.id = b.action;
            button.innerText = b.text;
            button.addEventListener('click', e => this.sendCommand(b.action, true));
            toolbar.appendChild(button);
        }

        const slot = document.createElement('slot');
        toolbar.appendChild(slot);

        this.editor = document.createElement('iframe');
        this.editor.id = 'editor';
        this.editor.setAttribute('src', `${componentPath}/sandbox.html`);

        // Allow scripts to run in the sandbox (required to consume the posted messages),
        // but DON'T allow-same-origin - malicious scripts can run in the iframe, but can't get out of it.
        this.editor.setAttribute('sandbox', 'allow-scripts');
        root.appendChild(this.editor);

        // Instead listen for window.postMessage from the iframe
        window.addEventListener('message', e => this.receiveMessage(e), false);

        // If we already have content set it
        if (this._content)
            this.sendCommand('html', false, this._content);
    }
}

customElements.define('html-editor', HtmlEditor);