type AudioBufferChangedHandler = (buffer: AudioBuffer) => void;

export type RemoveListener = () => void;

export class Loopr {
    private audioContext: AudioContext = null;
    private internalBuffer: AudioBuffer = null;
    private audioBufferChangedListeners: AudioBufferChangedHandler[] = [];

    constructor() {
        const ValidAudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (ValidAudioContext) {
            this.audioContext = new ValidAudioContext();
        }
    }

    private get buffer() {
        return this.internalBuffer;
    }

    private set buffer(buffer: AudioBuffer) {
        this.internalBuffer = buffer;
        this.audioBufferChangedListeners.forEach(listener => listener(buffer));
    }

    public setAudioFile = (file: File) => {
        const fileReader = new FileReader();
        fileReader.onloadend = () => this.audioContext.decodeAudioData(fileReader.result, buffer => this.buffer = buffer);
        fileReader.readAsArrayBuffer(file);
    }

    public onAudioBufferChanged = (listener: AudioBufferChangedHandler): RemoveListener => {
        this.audioBufferChangedListeners.push(listener);
        return () => {
            const index = this.audioBufferChangedListeners.indexOf(listener);
            this.audioBufferChangedListeners = this.audioBufferChangedListeners.filter((l, i) => i !== index);
        };
    }
}
