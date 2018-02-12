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

/** Bare bones HTML content editor that uses a sandboxed iframe to protect users. */
export class SandboxEditor extends HTMLElement {

    /** Holds the sandboxed iframe with the editable content. */
    private editor: HTMLIFrameElement;

    /** Holds true once we've received a DOM content loaded event from the iframe conent */
    private sandboxReady: boolean = false;

    /** Holds the content sent to the sandboxed iframe. */
    private _content: string;

    /** Get or set the editor content. */
    get content(): string { return this._content; };
    set content(c: string) {
        this._content = c;

        // If we have an editor send the command to update the HTML.
        this.setIframeContent();
    };

    /** Holds whether the contained iframe has fired a focus event on the contenteditable body. */
    private _hasFocus: boolean = false;

    /** Get or set whether this has focus */
    get focused(): boolean { return this._hasFocus; };
    set focused(f: boolean) {
        if (this._hasFocus === f)
            return;

        this._hasFocus = f;

        // Fire the notify event expected by Polymer for 2-way data binding
        this.dispatchEvent(new CustomEvent('focused-changed', { detail: { value: this._hasFocus } }));
    };

    static get observedAttributes() { return ['content']; }

    attributeChangedCallback(attr: string, oldValue: any, newValue: any) {
        (this as any)[attr] = newValue;
    }

    /** Send the content to the iframe */
    private async setIframeContent() {
        // If we don't have an editor then connected callback hasn't happened yet
        if (!this.editor)
            return;

        const c = this._content;

        // If the DOM ready hasn't fired yet keep waiting until it is
        while (!this.sandboxReady && c === this._content)
            await new Promise(requestAnimationFrame);

        if (c === this._content)
            this.sendCommand('html', false, this._content);
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
     * @param action Name of action from https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
     * @param value Optional value to set with the command. */
    editorAction(action: string, value?: string) {
        this.sendCommand(action, true, value);
    }

    /** When a message is received and the event source is the editor iframe then sync the content and fire the notification event. 
     * @param event The event holding the message details. */
    private receiveMessage(event: PostMessageEvent) {
        // We only care about events from our window
        if (this.editor && event.source === this.editor.contentWindow) {
            if ('html' in event.data) {
                this._content = event.data.html;

                // Fire the notify event expected by Polymer for 2-way data binding
                this.dispatchEvent(new CustomEvent('content-changed', { detail: { value: this._content } }));
            }

            if ('focus' in event.data)
                this.focused = event.data.focus;

            if ('ready' in event.data)
                this.sandboxReady = event.data.ready;
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
}`;
        root.appendChild(style);

        this.editor = document.createElement('iframe');
        this.editor.id = 'editor';
        this.editor.setAttribute('src', `${componentPath}/sandbox.html`);

        // Allow scripts to run in the sandbox (required to consume the posted messages),
        // but DON'T allow-same-origin - malicious scripts can run in the iframe, but can't get out of it.
        this.editor.setAttribute('sandbox', 'allow-scripts');

        // Instead listen for window.postMessage from the iframe
        window.addEventListener('message', e => this.receiveMessage(e), false);

        root.appendChild(this.editor);

        // If we already have content set it
        if (this._content)
            this.setIframeContent();
    }
}

customElements.define('sandbox-editor', SandboxEditor);