import { Locators } from './LooprInterface';

type AudioBufferChangedHandler = (buffer: AudioBuffer) => void;

export type RemoveListener = () => void;

export class Loopr {
    private audioContext: AudioContext = null;
    private internalBuffer: AudioBuffer = null;
    private audioBufferChangedListeners: AudioBufferChangedHandler[] = [];

    public startedAt: number = null;
    private source: AudioBufferSourceNode = null;
    private scriptNode: ScriptProcessorNode = null;

    constructor() {
        const ValidAudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (ValidAudioContext) {
            this.audioContext = new ValidAudioContext();
        }
    }

    // PROPERTIES

    private get buffer() {
        return this.internalBuffer;
    }

    private set buffer(buffer: AudioBuffer) {
        this.internalBuffer = buffer;
        this.audioBufferChangedListeners.forEach(listener => listener(buffer));
    }

    // PUBLIC METHODS

    public get currentPlaybackTime(): number {
        if (this.startedAt) {
            return this.audioContext.currentTime - this.startedAt;
        }

        return null;
    }

    public get duration(): number {
        return this.buffer.duration;
    }

    public setAudioFile = (file: File) => {
        const fileReader = new FileReader();
        fileReader.onloadend = async () => {
            this.buffer = await this.audioContext.decodeAudioData(fileReader.result);
            if (this.startedAt !== null) {
                this.stop();
            }
            this.scriptNode = this.audioContext.createScriptProcessor(4096, this.buffer.numberOfChannels, this.buffer.numberOfChannels);
            this.scriptNode.onaudioprocess = this.onAudioProcess;
        };
        fileReader.readAsArrayBuffer(file);
    }

    public onAudioBufferChanged = (listener: AudioBufferChangedHandler): RemoveListener => {
        this.audioBufferChangedListeners.push(listener);
        return () => {
            const index = this.audioBufferChangedListeners.indexOf(listener);
            this.audioBufferChangedListeners = this.audioBufferChangedListeners.filter((l, i) => i !== index);
        };
    }

    public play = ({ startPercent, endPercent }: Locators) => {
        if (this.source) { this.source.stop(); }
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.internalBuffer;
        this.source.connect(this.scriptNode);
        this.scriptNode.connect(this.audioContext.destination);
        const startSeconds = this.internalBuffer.duration * startPercent;
        const endSeconds = this.internalBuffer.duration * endPercent;
        this.source.loopStart = startSeconds;
        this.source.loopEnd = endSeconds;
        this.source.loop = true;
        this.startedAt = this.audioContext.currentTime;
        this.source.start(0, startSeconds);
    }

    public stop = () => {
        if (this.source) {
            this.source.stop();
            this.source.disconnect(this.scriptNode);
            this.scriptNode.removeEventListener('onaudioprocess', this.onAudioProcess);
            this.scriptNode.disconnect(this.audioContext.destination);
        }
        this.startedAt = null;
        this.source = null;
    }

    public setLoopFromLocators = ({ startPercent, endPercent }: Locators) => {
        if (this.source && this.startedAt !== null) {
            const startSeconds = this.internalBuffer.duration * startPercent;
            const endSeconds = this.internalBuffer.duration * endPercent;
            this.source.loopStart = startSeconds;
            this.source.loopEnd = endSeconds;
        }
    }

    // PRIVATE METHODS 

    private onAudioProcess = ({ inputBuffer, outputBuffer }: AudioProcessingEvent) => {
        for (let channel = 0; channel < outputBuffer.numberOfChannels; channel += 1) {
            const inputData = inputBuffer.getChannelData(channel);
            const outputData = outputBuffer.getChannelData(channel);
            for (let sample = 0; sample < inputBuffer.length; sample += 1) {
                outputData[sample] = inputData[sample];
            }
        }
    }
}
