type AudioBufferChangedHandler = (buffer: AudioBuffer) => void;

export type RemoveListener = () => void;

export class Loopr {
    private audioContext: AudioContext = null;
    private internalBuffer: AudioBuffer = null;
    private audioBufferChangedListeners: AudioBufferChangedHandler[] = [];

    private startedAt: number = null;
    private source: AudioBufferSourceNode = null;

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

    public get currentPlaybackTime(): number {
        if (this.startedAt) {
            return this.audioContext.currentTime - this.startedAt;
        }

        return null;
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

    public play = ({ startLocatorPercent = 0, endLocatorPercent }) => {
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.internalBuffer;
        this.source.connect(this.audioContext.destination);
        const startSeconds = this.internalBuffer.duration * startLocatorPercent;
        if (endLocatorPercent != null) {
            const endSeconds = this.internalBuffer.duration * endLocatorPercent;
            this.source.loopStart = startSeconds;
            this.source.loopEnd = endSeconds;
            this.source.loop = true;
        }
        this.startedAt = this.audioContext.currentTime;
        this.source.start(0, startSeconds);
    }

    public stop = () => {
        if (this.startedAt) { this.source.stop(); }
        this.startedAt = null;
    }
}
