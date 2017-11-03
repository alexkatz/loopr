import { Locators } from './Track';
import BufferedPV from '../phaseVocoder/Echo66PhaseVocoder';

const FRAME_SIZE = 2048;
const BUFFER_SIZE = 4096;

type AudioBufferChangedHandler = (buffer: AudioBuffer) => void;

export type RemoveListener = () => void;

export class Player {
    private audioContext: AudioContext = null;
    private internalBuffer: AudioBuffer = null;
    private audioBufferChangedListeners: AudioBufferChangedHandler[] = [];

    public startedAt: number = null;
    private source: AudioBufferSourceNode = null;
    private scriptNode: ScriptProcessorNode = null;
    private gainNode: GainNode = null;

    private phaseVocoder: any = null;

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

    public set alpha(value: number) {
        if (this.phaseVocoder) {
            this.phaseVocoder.alpha = value;
        }
    }

    public get alpha(): number {
        return this.phaseVocoder.alpha;
    }

    // PUBLIC METHODS

    public get currentPlaybackTime(): number {
        if (this.startedAt) {
            return this.audioContext.currentTime - this.startedAt;
        }

        return null;
    }

    public get alphaDuration(): number {
        return this.buffer.duration * this.alpha;
    }

    public get alphaLoopStart(): number {
        return this.startedAt !== null ? this.source.loopStart * this.alpha : null;
    }

    public get alphaLoopEnd(): number {
        return this.startedAt !== null ? this.source.loopEnd * this.alpha : null;
    }

    public setAudioFile = (file: File) => {
        const fileReader = new FileReader();
        fileReader.onloadend = async () => {
            this.buffer = await this.audioContext.decodeAudioData(fileReader.result);
            if (this.startedAt !== null) {
                this.source.disconnect(this.scriptNode);
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
        this.gainNode.gain.value = 1;
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.connect(this.scriptNode);
        const startSeconds = this.buffer.duration * startPercent;
        const endSeconds = this.buffer.duration * endPercent;
        this.phaseVocoder.position = this.buffer.length * startPercent;
        this.source.loopStart = startSeconds;
        this.source.loopEnd = endSeconds;
        this.source.loop = true;
        this.startedAt = this.audioContext.currentTime;
        this.source.start(0, startSeconds);
    }

    public stop = () => {
        this.gainNode.gain.value = 0;
        this.startedAt = null;
        this.phaseVocoder.clear();
        this.previousOverallProgress = null;
        if (this.source) {
            this.source.stop();
            this.source = null;
        }
    }

    public setLoopFromLocators = ({ startPercent, endPercent }: Locators) => {
        if (this.source && this.startedAt !== null) {
            const startSeconds = this.buffer.duration * startPercent;
            const endSeconds = this.buffer.duration * endPercent;
            this.phaseVocoder.position = this.buffer.length * startPercent;
            this.source.loopStart = startSeconds;
            this.source.loopEnd = endSeconds;
        }
    }

    // PRIVATE METHODS 

    private previousOverallProgress: number = null;
    private onAudioProcess = ({ inputBuffer, outputBuffer, playbackTime }: AudioProcessingEvent) => {
        if (this.startedAt !== null) {
            const loopDuration = this.alphaLoopEnd - this.alphaLoopStart;
            const overallProgress = playbackTime - this.startedAt;
            if (this.previousOverallProgress !== null) {
                const newProgress = overallProgress - this.previousOverallProgress;
                const loopProgress = overallProgress % loopDuration;
                if ((loopProgress + newProgress) > (loopDuration - 0.001)) {
                    this.phaseVocoder.position = this.buffer.length * (this.alphaLoopStart / this.alphaDuration); // this should not be happening here...
                }
            }
            this.phaseVocoder.process(outputBuffer);
            this.previousOverallProgress = overallProgress;
        } else {
            for (let channel = 0; channel < outputBuffer.numberOfChannels; channel += 1) {
                const inputData = inputBuffer.getChannelData(channel);
                const outputData = outputBuffer.getChannelData(channel);
                for (let sample = 0; sample < inputBuffer.length; sample += 1) {
                    outputData[sample] = inputData[sample];
                }
            }
        }
    }

    private updateVocoderPosition = () => {

    }
}
