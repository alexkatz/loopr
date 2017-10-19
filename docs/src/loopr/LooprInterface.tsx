import * as React from 'react';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';
import { Loopr } from './loopr';

const CANVAS_HEIGHT = 200;
const PLAYBACK_BAR_WIDTH = 5;
const MIN_LOOP_PERCENT = 0.001;

interface Locators {
    startLocatorPercent: number;
    endLocatorPercent: number;
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
    locator1Percent: number;
    locator2Percent: number;
    isMouseDown: boolean;
    lastPlaybackLocators: Locators; // TODO: draw these too, so locators stay present even if user alters locators during playback...
}

class LooprInterface extends React.Component<LooprViewProps, LooprViewState> {
    private canvas: HTMLCanvasElement = null;
    private loopr: Loopr = null;
    private isPlaying: boolean = false;

    constructor(props: LooprViewProps) {
        super(props);
        this.loopr = props.loopr;
    }

    public componentWillMount() {
        const { audioBuffer, loopr } = this.props;
        if (audioBuffer) {
            this.hydrateChannelData(audioBuffer);
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
        const { audioBuffer: currBuffer, width: prevWidth } = this.props;
        const { audioBuffer: nextBuffer, width: nextWidth } = nextProps;
        if (nextBuffer !== currBuffer) {
            this.hydrateChannelData(nextBuffer);
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

        } else {
            this.setState({ locator1Percent: x / width, isMouseDown: true, locator2Percent: null });
        }
    }

    private onMouseMove = (e: MouseEvent) => {
        const { locator1Percent, isMouseDown } = this.state;
        if (isMouseDown) {
            const { width } = this.props;
            const { left } = this.canvas.getBoundingClientRect();
            const x = e.clientX - left;
            const locator2Percent = x / width;
            this.setState({ locator2Percent: Math.abs(locator1Percent - locator2Percent) > MIN_LOOP_PERCENT ? locator2Percent : null });
        }
    }

    private onMouseUp = (e: MouseEvent) => {
        const { width } = this.props;
        const { locator1Percent } = this.state;
        const { left } = this.canvas.getBoundingClientRect();
        const x = e.clientX - left;
        const locator2Percent = x / width;
        this.setState({ isMouseDown: false, locator2Percent: Math.abs(locator1Percent - locator2Percent) > MIN_LOOP_PERCENT ? locator2Percent : null });
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

    private hydrateChannelData = (audioBuffer: AudioBuffer, callback?: () => void) => {
        const leftChannelData = audioBuffer.getChannelData(0);
        const rightChannelData = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
        const { lowPeak, highPeak } = this.getPeaks(leftChannelData, rightChannelData || []);
        this.setState({
            leftChannelData,
            rightChannelData,
            lowPeak,
            highPeak,
        }, callback);
    }

    private getPeaks = (...channels): { highPeak: number, lowPeak: number } => {
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
        context.fillRect(0, MID_Y, width, 1);
        for (let i = 0; i < width; i += 0.5) {
            const amplitude = Math.abs(leftChannelData[Math.round((i * 2) * DECIMATION_FACTOR)] * NORMALIZE_FACTOR);
            context.fillRect(i, MID_Y - amplitude, 0.5, amplitude * 2);
        }
    }

    private drawLocators = (context: CanvasRenderingContext2D, width: number) => {
        const { startLocatorPercent, endLocatorPercent } = this.getStartEndLocators();
        if (startLocatorPercent !== null) {
            context.fillStyle = Color.CURSOR_COLOR;
            const leftLocatorX = width * startLocatorPercent;
            context.fillRect(leftLocatorX, 0, 1, CANVAS_HEIGHT);
            if (endLocatorPercent !== null) {
                const rightLocatorX = width * endLocatorPercent;
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
        const { lastPlaybackLocators: { startLocatorPercent, endLocatorPercent } } = this.state;
        const isLoop = startLocatorPercent !== null && endLocatorPercent !== null;
        const progressPercent = this.loopr.currentPlaybackTime / this.loopr.duration;
        const progressWidth = width * progressPercent % (isLoop ? (width * endLocatorPercent) - (width * startLocatorPercent) : width);
        context.fillStyle = Color.SELECTION_COLOR;
        context.fillRect((width * startLocatorPercent), 0, progressWidth, CANVAS_HEIGHT);
    }

    private getStartEndLocators = (): Locators => {
        const { locator1Percent, locator2Percent } = this.state;
        const startLocatorPercent = (locator2Percent === null) || (locator1Percent <= locator2Percent) ? locator1Percent : locator2Percent;
        const endLocatorPercent = startLocatorPercent === locator1Percent ? locator2Percent : locator1Percent;
        return { startLocatorPercent, endLocatorPercent };
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
