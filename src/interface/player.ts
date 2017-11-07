import { Locators } from './Track';
import BufferedPV from '../phaseVocoder/Echo66PhaseVocoder';

const FRAME_SIZE = 2048;
const BUFFER_SIZE = 4096;

type AudioBufferChangedHandler = (buffer: AudioBuffer) => void;

export type RemoveListener = () => void;

export class Player {
    private internalBuffer: AudioBuffer = null;
    private audioBufferChangedListeners: AudioBufferChangedHandler[] = [];

    private scriptNode: ScriptProcessorNode = null;
    private gainNode: GainNode = null;

    private phaseVocoder: any = null;

    constructor() {
        const ValidAudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (ValidAudioContext) {
            this.audioContext = new ValidAudioContext();
        }
    }

    // PUBLIC 

    public audioContext: AudioContext = null;
    public startedAt: number = null;
    public playbackProgressSeconds: number = null;
    public loopStartPercent: number;
    public loopEndPercent: number;

    public get buffer() {
        return this.internalBuffer;
    }

    public set alpha(value: number) {
        if (this.phaseVocoder) {
            this.phaseVocoder.alpha = value;
        }
    }

    public get alpha(): number {
        return this.phaseVocoder.alpha;
    }

    public get position(): number {
        return this.phaseVocoder.position;
    }

    public set position(value: number) {
        this.phaseVocoder.position = value;
    }

    public get loopStartSeconds(): number {
        if (!this.loopStartPercent) { return null; }
        return this.loopStartPercent * this.buffer.duration;
    }

    public get loopEndSeconds(): number {
        if (!this.loopEndPercent) { return null; }
        return this.loopEndPercent * this.buffer.duration;
    }

    public setBuffer = (buffer: AudioBuffer) => {
        this.internalBuffer = buffer;
        this.audioBufferChangedListeners.forEach(listener => listener(buffer));
        if (this.startedAt !== null) {
            this.scriptNode.disconnect(this.gainNode);
            this.gainNode.disconnect(this.audioContext.destination);
            this.stop();
        }
        this.phaseVocoder = new BufferedPV(FRAME_SIZE);
        this.phaseVocoder.set_audio_buffer(this.buffer);
        this.phaseVocoder.alpha = 1;
        this.phaseVocoder.position = 0;
        this.scriptNode = this.audioContext.createScriptProcessor(4096, this.buffer.numberOfChannels, this.buffer.numberOfChannels);
        this.gainNode = this.audioContext.createGain();
        this.scriptNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        this.scriptNode.onaudioprocess = this.onAudioProcess;
    }

    public setAudioFile = (file: File) => {
        const fileReader = new FileReader();
        fileReader.onloadend = async () => this.setBuffer(await this.audioContext.decodeAudioData(fileReader.result));
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
        this.loopStartPercent = startPercent;
        this.loopEndPercent = endPercent;
        this.phaseVocoder.position = this.buffer.length * startPercent;
        this.startedAt = this.audioContext.currentTime;
    }

    public stop = () => {
        this.startedAt = null;
        this.loopStartPercent = null;
        this.loopEndPercent = null;
    }

    public setLoopFromLocators = ({ startPercent, endPercent }: Locators) => {
        if (this.startedAt !== null) {
            const startSeconds = this.buffer.duration * startPercent;
            const endSeconds = this.buffer.duration * endPercent;
            this.phaseVocoder.position = this.buffer.length * startPercent;
        }
    }

    // PRIVATE 

    private onAudioProcess = ({ outputBuffer }: AudioProcessingEvent) => {
        if (this.startedAt !== null) {
            this.playbackProgressSeconds = (this.playbackProgressSeconds == null ? 0 : this.playbackProgressSeconds) + (outputBuffer.length / this.audioContext.sampleRate) / this.alpha;
            this.phaseVocoder.process(outputBuffer);
        } else {
            this.playbackProgressSeconds = null;
            for (let channel = 0; channel < outputBuffer.numberOfChannels; channel += 1) {
                const outputData = outputBuffer.getChannelData(channel);
                for (let sample = 0; sample < outputData.length; sample += 1) {
                    outputData[sample] = 0;
                }
            }
        }
    }
}
