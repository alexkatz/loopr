import * as React from 'react';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';
import { Loopr } from './loopr';

const CANVAS_HEIGHT = 200;
const PLAYBACK_BAR_WIDTH = 5;
const MIN_LOOP_PERCENT = 0.001;

export interface Locators {
    startPercent?: number;
    endPercent?: number;
}

interface LooprViewProps {
    width: number;
    height: number;
    audioBuffer?: AudioBuffer;
    loopr: Loopr;
}

interface LooprViewState {
    leftChannelData: Float32Array;
    rightChannelData: Float32Array;
    lowPeak: number;
    highPeak: number;
    isMouseDown: boolean;
    lastPlaybackLocators: Locators; // TODO: draw these too, so locators stay present even if user alters locators during playback...
    zoomLocators: Locators;
    playbackLocators: Locators;
}

class LooprInterface extends React.Component<LooprViewProps, Partial<LooprViewState>> {
    private canvas: HTMLCanvasElement = null;
    private loopr: Loopr = null;
    private isPlaying: boolean = false;

    constructor(props: LooprViewProps) {
        super(props);
        this.loopr = props.loopr;
        this.state = { playbackLocators: {} };
    }

    public componentWillMount() {
        const { audioBuffer, loopr } = this.props;
        if (audioBuffer) {
            this.setChannelData(audioBuffer);
        }
    }

    public componentDidMount() {
        this.subscribeToWindowMouseEvents();
        window.addEventListener('keydown', this.onKeyDown);
        this.draw();
    }

    public componentWillUnmount() {
        this.loopr = null;
        this.UnsubscribeFromWindowMouseEvents();
        window.removeEventListener('keydown', this.onKeyDown);
    }

    public componentWillReceiveProps(nextProps: LooprViewProps) {
        if (nextProps.audioBuffer !== this.props.audioBuffer) {
            this.setChannelData(nextProps.audioBuffer);
        }
    }

    public componentDidUpdate(prevProps: LooprViewProps) {
        this.draw();
    }

    public render() {
        const { width, height } = this.props;
        return (
            <div
                style={{
                    width,
                    height,
                }}
            >
                <div
                    style={{
                        color: Color.MID_BLUE,
                        fontWeight: Constant.FontWeight.REGULAR,
                        fontSize: 30,
                        padding: Constant.PADDING,
                    }}
                >
                    Loopr
                </div>
                <canvas
                    ref={canvas => this.canvas = canvas}
                    width={width}
                    height={CANVAS_HEIGHT}
                    style={{
                        backgroundColor: Color.MID_BLUE,
                        cursor: 'text',
                    }}
                    onMouseDown={this.onMouseDown}
                />
            </div>
        );
    }

    // MOUSE EVENTS

    private onMouseDown: React.MouseEventHandler<HTMLCanvasElement> = e => {
        const { width } = this.props;
        const { left } = this.canvas.getBoundingClientRect();
        const x = e.clientX - left;
        if (e.shiftKey) {
            // no-op for now
        } else {
            this.setState({
                isMouseDown: true,
                playbackLocators: {
                    startPercent: x / width,
                    endPercent: null,
                },
            });
        }
    }

    private onMouseMove = (e: MouseEvent) => {
        const { playbackLocators: { startPercent }, isMouseDown } = this.state;
        if (isMouseDown) {
            const { width } = this.props;
            const { left } = this.canvas.getBoundingClientRect();
            const x = e.clientX - left;
            const endPercent = x / width;
            this.setState({
                playbackLocators: {
                    startPercent,
                    endPercent: Math.abs(startPercent - endPercent) > MIN_LOOP_PERCENT ? endPercent : null,
                },
            });
        }
    }

    private onMouseUp = (e: MouseEvent) => {
        const { width } = this.props;
        const { playbackLocators: { startPercent } } = this.state;
        const { left } = this.canvas.getBoundingClientRect();
        const x = e.clientX - left;
        const endPercent = x / width;
        this.setState({
            isMouseDown: false,
            playbackLocators: {
                startPercent,
                endPercent: Math.abs(startPercent - endPercent) > MIN_LOOP_PERCENT ? endPercent : null,
            },
        });
    }

    private onKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === Constant.Key.SHIFT) {
            // no-op for now
        } else if (e.key === Constant.Key.SPACE) {
            this.startPlayback();
        } else {
            this.loopr.stop();
        }
    }

    // PRIVATE METHODS

    private draw() {
        const context = this.canvas.getContext('2d');
        const { width } = this.props;
        context.clearRect(0, 0, width, CANVAS_HEIGHT);
        this.drawWaveform(context, width);
        this.drawLocators(context, width);
        this.drawPlaybackProgress(context, width);
    }

    private subscribeToWindowMouseEvents = () => {
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
    }

    private UnsubscribeFromWindowMouseEvents = () => {
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('mousemove', this.onMouseMove);
    }

    private setChannelData = (audioBuffer: AudioBuffer, { startPercent = 0, endPercent = 1 }: Locators = {} as Locators) => {
        const getSubArray = (channelData: Float32Array): Float32Array => channelData.slice(
            Math.round(channelData.length * startPercent),
            Math.round(channelData.length * endPercent),
        );
        const leftChannelData = getSubArray(audioBuffer.getChannelData(0));
        const rightChannelData = audioBuffer.numberOfChannels > 1 ? getSubArray(audioBuffer.getChannelData(1)) : null;
        const { lowPeak, highPeak } = this.getPeaks(leftChannelData, rightChannelData || undefined);
        this.setState({
            leftChannelData,
            rightChannelData,
            lowPeak,
            highPeak,
        });
    }

    private getPeaks = (...channels: Float32Array[]): { highPeak: number, lowPeak: number } => {
        let lowPeak = 0;
        let highPeak = 0;
        channels.forEach(channelData => channelData.forEach(amplitude => {
            if (amplitude < lowPeak) { lowPeak = amplitude; }
            if (amplitude > highPeak) { highPeak = amplitude; }
        }));
        return { lowPeak, highPeak };
    }

    private log10 = x => Math.log(x) * Math.LOG10E;
    private roundHalf = x => Math.round(x * 2) / 2;

    private drawWaveform = (context: CanvasRenderingContext2D, width: number) => { // TODO: color waveform differently when within loop boundaries or playback progress boundaries...
        const pixelCount = width * 2;
        const { leftChannelData, rightChannelData, lowPeak, highPeak } = this.state;
        const MID_Y = CANVAS_HEIGHT / 2;
        const peak = Math.max(Math.abs(lowPeak), highPeak);
        const NORMALIZE_FACTOR = CANVAS_HEIGHT / peak;
        const DECIMATION_FACTOR = leftChannelData.length / pixelCount;
        context.fillStyle = Color.DARK_BLUE;
        for (let i = 0; i < width; i += 0.5) {
            const amplitude = Math.abs(leftChannelData[Math.round((i * 2) * DECIMATION_FACTOR)] * NORMALIZE_FACTOR);
            context.fillRect(i, MID_Y - amplitude, 0.5, amplitude * 2);
        }
    }

    private drawLocators = (context: CanvasRenderingContext2D, width: number) => {
        const { startPercent, endPercent } = this.getStartEndLocators();
        if (startPercent !== null) {
            context.fillStyle = Color.CURSOR_COLOR;
            const leftLocatorX = width * startPercent;
            context.fillRect(leftLocatorX, 0, 1, CANVAS_HEIGHT);
            if (endPercent !== null) {
                const rightLocatorX = width * endPercent;
                context.fillRect(rightLocatorX, 0, 1, CANVAS_HEIGHT);
                context.fillStyle = Color.SELECTION_COLOR;
                const startX = leftLocatorX + 1;
                const endX = rightLocatorX;
                context.fillRect(startX, 0, endX - startX, CANVAS_HEIGHT);
            }
        }
    }

    private drawPlaybackProgress = (context: CanvasRenderingContext2D, width: number) => {
        if (this.loopr.currentPlaybackTime === null) { return; }
        const { lastPlaybackLocators: { startPercent, endPercent } } = this.state;
        const isLoop = startPercent !== null && endPercent !== null;
        const progressPercent = this.loopr.currentPlaybackTime / this.loopr.duration;
        const progressWidth = width * progressPercent % (isLoop ? (width * endPercent) - (width * startPercent) : width);
        context.fillStyle = Color.SELECTION_COLOR;
        context.fillRect((width * startPercent), 0, progressWidth, CANVAS_HEIGHT);
    }

    private getStartEndLocators = (): Locators => {
        const { playbackLocators: { startPercent: locator1Percent, endPercent: locator2Percent } } = this.state;
        const startPercent = (locator2Percent === null) || (locator1Percent <= locator2Percent) ? locator1Percent : locator2Percent;
        const endPercent = startPercent === locator1Percent ? locator2Percent : locator1Percent;
        return { startPercent, endPercent };
    }

    private startPlayback = () => {
        const lastPlaybackLocators = this.getStartEndLocators();
        this.setState({ lastPlaybackLocators }, () => {
            this.loopr.play(lastPlaybackLocators);
            if (!this.isPlaying) {
                this.isPlaying = true;
                window.requestAnimationFrame(this.animatePlayback);
            }
        });
    }

    private stopPlayback = () => {
        this.loopr.stop();
        this.isPlaying = false;
    }

    private animatePlayback: FrameRequestCallback = () => {
        this.draw();
        if (this.isPlaying) {
            window.requestAnimationFrame(this.animatePlayback);
        }
    }
}

export { LooprInterface };
