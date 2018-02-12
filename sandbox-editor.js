const stack = (new Error().stack || '').split('at');
const scriptPath = stack[stack.length - 1].trim();
const componentPath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
export class SandboxEditor extends HTMLElement {
    constructor() {
        super(...arguments);
        this.sandboxReady = false;
        this._hasFocus = false;
    }
    get content() { return this._content; }
    ;
    set content(c) {
        this._content = c;
        this.setIframeContent();
    }
    ;
    get focused() { return this._hasFocus; }
    ;
    set focused(f) {
        if (this._hasFocus === f)
            return;
        this._hasFocus = f;
        this.dispatchEvent(new CustomEvent('focused-changed', { detail: { value: this._hasFocus } }));
    }
    ;
    static get observedAttributes() { return ['content']; }
    attributeChangedCallback(attr, oldValue, newValue) {
        this[attr] = newValue;
    }
    async setIframeContent() {
        if (!this.editor)
            return;
        const c = this._content;
        while (!this.sandboxReady && c === this._content)
            await new Promise(requestAnimationFrame);
        if (c === this._content)
            this.sendCommand('html', false, this._content);
    }
    sendCommand(command, focus, content) {
        if (!this.editor)
            return false;
        this.editor.contentWindow.postMessage({ command, content }, '*');
        if (focus)
            this.editor.contentWindow.focus();
        return true;
    }
    editorAction(action, value) {
        this.sendCommand(action, true, value);
    }
    receiveMessage(event) {
        if (this.editor && event.source === this.editor.contentWindow) {
            if ('html' in event.data) {
                this._content = event.data.html;
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
        this.editor.setAttribute('sandbox', 'allow-scripts');
        window.addEventListener('message', e => this.receiveMessage(e), false);
        root.appendChild(this.editor);
        if (this._content)
            this.setIframeContent();
    }
}
customElements.define('sandbox-editor', SandboxEditor);
