const stack = (new Error().stack || '').split('at');
const scriptPath = stack[stack.length - 1].trim();
const componentPath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
export class HtmlEditor extends HTMLElement {
    get content() { return this._content; }
    ;
    set content(c) {
        this._content = c;
        if (this.editor)
            this.sendCommand('html', false, this._content);
    }
    ;
    static get observedAttributes() { return ['content']; }
    attributeChangedCallback(attr, oldValue, newValue) {
        this[attr] = newValue;
    }
    sendCommand(command, focus, content) {
        if (!this.editor)
            return false;
        this.editor.contentWindow.postMessage({ command, content }, '*');
        if (focus)
            this.editor.contentWindow.focus();
        return true;
    }
    editorAction(action) {
        this.sendCommand(action, true);
    }
    receiveMessage(event) {
        if (this.editor && event.source === this.editor.contentWindow) {
            this._content = event.data.html;
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
        this.editor.setAttribute('sandbox', 'allow-scripts');
        root.appendChild(this.editor);
        window.addEventListener('message', e => this.receiveMessage(e), false);
        if (this._content)
            this.sendCommand('html', false, this._content);
    }
}
HtmlEditor.buttons = [
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
customElements.define('html-editor', HtmlEditor);
