import * as React from 'react';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';
import { Loopr } from './loopr';

const PLAYBACK_BAR_WIDTH = 5;
const HEADER_HEIGHT = 70;
const CANVAS_HEIGHT_PERCENT = 0.7;
const MIN_LOOP_PERCENT = 0.001;
const DEFAULT_LOCATORS: Locators = { startPercent: 0, endPercent: 1 };
const GET_CANVAS_HEIGHT = height => (height - HEADER_HEIGHT) * CANVAS_HEIGHT_PERCENT;

export interface Locators {
    startPercent?: number;
    endPercent?: number;
}

interface LooprInterfaceProps {
    width: number;
    height: number;
    audioBuffer?: AudioBuffer;
    loopr: Loopr;
}

interface LooprInterfaceState {
    canvasHeight: number;
    leftChannelData: Float32Array;
    rightChannelData: Float32Array;
    lowPeak: number;
    highPeak: number;
    isMouseDown: boolean;
    lastPlaybackLocators: Locators; // TODO: draw these too, so locators stay present even if user alters locators during playback...
    zoomLocators: Locators;
    playbackLocators: Locators;
}

class LooprInterface extends React.Component<LooprInterfaceProps, Partial<LooprInterfaceState>> {
    private canvas: HTMLCanvasElement = null;
    private loopr: Loopr = null;
    private isPlaying: boolean = false;

    constructor(props: LooprInterfaceProps) {
        super(props);
        this.loopr = props.loopr;
        this.state = {
            playbackLocators: DEFAULT_LOCATORS,
            canvasHeight: GET_CANVAS_HEIGHT(props.height),
        };
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

    public componentWillReceiveProps(nextProps: LooprInterfaceProps) {
        const { audioBuffer, height } = this.props;
        if (nextProps.audioBuffer !== audioBuffer) {
            this.setChannelData(nextProps.audioBuffer);
        }
        if (height !== nextProps.height) {
            this.setState({ canvasHeight: GET_CANVAS_HEIGHT(nextProps.height) });
        }
    }

    public componentDidUpdate() {
        this.draw();
    }

    public render() {
        const { width, height } = this.props;
        const { canvasHeight } = this.state;
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
                        height: HEADER_HEIGHT,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: Constant.PADDING,
                    }}
                >
                    Loopr
                </div>
                <canvas
                    ref={canvas => this.canvas = canvas}
                    width={width}
                    height={canvasHeight}
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
        const { playbackLocators: { startPercent } } = this.state;
        const { left } = this.canvas.getBoundingClientRect();
        const x = e.clientX - left;
        const newStartPercent = x / width;
        const isRemovingStartLocator = Math.abs(startPercent - newStartPercent) <= MIN_LOOP_PERCENT;
        if (e.shiftKey) {
            // no-op for now
        } else {
            this.setState({
                isMouseDown: true,
                playbackLocators: {
                    startPercent: isRemovingStartLocator ? 0 : newStartPercent,
                    endPercent: 1,
                },
            }, () => isRemovingStartLocator && this.stopPlayback());
        }
    }

    private onMouseMove = (e: MouseEvent) => {
        const { playbackLocators, isMouseDown } = this.state;
        if (isMouseDown && playbackLocators) {
            this.handleMouse(e.clientX, playbackLocators.startPercent);
        }
    }

    private onMouseUp = (e: MouseEvent) => {
        const { playbackLocators } = this.state;
        if (playbackLocators) {
            this.handleMouse(e.clientX, playbackLocators.startPercent, true);
        }
    }

    private handleMouse = (clientX: number, startPercent: number, isMouseUp = false) => {
        const { width } = this.props;
        const { left } = this.canvas.getBoundingClientRect();
        const x = clientX - left;
        const endPercent = x / width;
        this.setState({
            isMouseDown: !isMouseUp,
            playbackLocators: {
                startPercent,
                endPercent: Math.abs(startPercent - endPercent) > MIN_LOOP_PERCENT ? endPercent : 1,
            },
        }, () => this.isPlaying && isMouseUp && this.startPlayback());
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if (!e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            switch (e.keyCode) {
                case Constant.Key.SHIFT:
                    break;
                case Constant.Key.Z:
                    return e.shiftKey ? this.zoomOut() : this.zoomIn(this.getTrueLocators(this.getRelativeLocators()));
                case Constant.Key.SPACE:
                    return e.shiftKey ? this.stopPlayback() : this.startPlayback();
                case Constant.Key.ESCAPE:
                    return this.stopPlayback();
            }
        }
    }

    // PRIVATE METHODS

    private draw() {
        const context = this.canvas.getContext('2d');
        const { width } = this.props;
        const { canvasHeight } = this.state;
        context.clearRect(0, 0, width, canvasHeight);
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

    private zoomIn = (zoomLocators: Locators) => {
        this.setChannelData(this.props.audioBuffer, zoomLocators);
    }

    private zoomOut = () => {
        if (this.state.zoomLocators === DEFAULT_LOCATORS) { return; }
        const playbackLocators = this.getTrueLocators(this.state.playbackLocators);
        this.setChannelData(this.props.audioBuffer, DEFAULT_LOCATORS, playbackLocators, playbackLocators);
    }

    private setChannelData = (audioBuffer: AudioBuffer, zoomLocators: Locators = DEFAULT_LOCATORS, playbackLocators: Locators = DEFAULT_LOCATORS, lastPlaybackLocators: Locators = DEFAULT_LOCATORS) => {
        const getSubArray = (channelData: Float32Array): Float32Array => channelData.slice(
            Math.round(channelData.length * zoomLocators.startPercent),
            Math.round(channelData.length * zoomLocators.endPercent),
        );
        const leftChannelData = getSubArray(audioBuffer.getChannelData(0));
        const rightChannelData = audioBuffer.numberOfChannels > 1 ? getSubArray(audioBuffer.getChannelData(1)) : null;
        const { lowPeak, highPeak } = this.getPeaks(leftChannelData, rightChannelData || undefined);
        this.setState({
            leftChannelData,
            rightChannelData,
            lowPeak,
            highPeak,
            zoomLocators,
            playbackLocators,
            lastPlaybackLocators,
        });
    }

    private getPeaks = (...channels: Float32Array[]): { highPeak: number, lowPeak: number } => {
        let lowPeak = 0;
        let highPeak = 0;
        channels.filter(c => c).forEach(channelData => channelData.forEach(amplitude => {
            if (amplitude < lowPeak) { lowPeak = amplitude; }
            if (amplitude > highPeak) { highPeak = amplitude; }
        }));
        return { lowPeak, highPeak };
    }

    private log10 = x => Math.log(x) * Math.LOG10E;
    private roundHalf = x => Math.round(x * 2) / 2;

    private drawWaveform = (context: CanvasRenderingContext2D, width: number) => { // TODO: color waveform differently when within loop boundaries or playback progress boundaries...
        const { leftChannelData, rightChannelData, lowPeak, highPeak, canvasHeight } = this.state;
        const pixelCount = width * 2;
        const peak = Math.max(Math.abs(lowPeak), highPeak);
        const NORMALIZE_FACTOR = (rightChannelData ? canvasHeight * 0.25 : canvasHeight * 0.5) / peak;

        const drawChannel = (channelData, midY) => {
            const DECIMATION_FACTOR = channelData.length / pixelCount;
            context.fillStyle = Color.DARK_BLUE;
            for (let i = 0; i < width; i += 0.5) {
                const amplitude = Math.abs(channelData[Math.round((i * 2) * DECIMATION_FACTOR)] * NORMALIZE_FACTOR);
                context.fillRect(i, midY - amplitude, 0.5, amplitude * 2);
            }
        };

        drawChannel(leftChannelData, rightChannelData ? canvasHeight * 0.25 : canvasHeight * 0.5);
        if (rightChannelData) { drawChannel(rightChannelData, canvasHeight * 0.75); }
    }

    private drawLocators = (context: CanvasRenderingContext2D, width: number) => {
        const { startPercent, endPercent } = this.getRelativeLocators();
        const { canvasHeight } = this.state;
        if (startPercent > 0) {
            context.fillStyle = Color.CURSOR_COLOR;
            const leftLocatorX = width * startPercent;
            context.fillRect(leftLocatorX, 0, 1, canvasHeight);
            if (endPercent < 1) {
                const rightLocatorX = width * endPercent;
                context.fillRect(rightLocatorX, 0, 1, canvasHeight);
                context.fillStyle = Color.SELECTION_COLOR;
                const startX = leftLocatorX + 1;
                const endX = rightLocatorX;
                context.fillRect(startX, 0, endX - startX, canvasHeight);
            }
        }
    }

    private drawPlaybackProgress = (context: CanvasRenderingContext2D, width: number) => {
        if (this.loopr.currentPlaybackTime === null) { return; }
        const { lastPlaybackLocators, canvasHeight, zoomLocators: { startPercent: zoomStartPercent, endPercent: zoomEndPercent } } = this.state;
        const { startPercent: trueLocatorStartPercent, endPercent: trueLocatorEndPercent } = this.getTrueLocators(lastPlaybackLocators);
        const { startPercent: relativeLocatorStartPercent } = this.getRelativeLocators(lastPlaybackLocators);
        const zoomFactor = 1 / (zoomEndPercent - zoomStartPercent);
        const progressPercent = this.loopr.currentPlaybackTime / this.loopr.duration;
        const progressWidth = (width * progressPercent) % ((width * trueLocatorEndPercent) - (width * trueLocatorStartPercent));
        context.fillStyle = Color.SELECTION_COLOR;
        context.fillRect((width * relativeLocatorStartPercent), 0, progressWidth * zoomFactor, canvasHeight);
    }

    private getRelativeLocators = ({ startPercent: locator1Percent, endPercent: locator2Percent }: Locators = this.state.playbackLocators): Locators => {
        const startPercent = (locator2Percent === null) || (locator1Percent <= locator2Percent) ? locator1Percent : locator2Percent;
        const endPercent = startPercent === locator1Percent ? locator2Percent : locator1Percent;
        return { startPercent, endPercent };
    }

    private getTrueLocators = ({ startPercent, endPercent }: Locators): Locators => {
        const { zoomLocators: { startPercent: zoomStart, endPercent: zoomEnd } } = this.state;
        const trueStart = zoomStart + ((zoomEnd - zoomStart) * startPercent);
        const trueEnd = zoomStart + ((zoomEnd - zoomStart) * endPercent);
        return { startPercent: trueStart, endPercent: trueEnd };
    }

    private startPlayback = (continuePlayback = false) => {
        const lastPlaybackLocators = this.getRelativeLocators();
        this.setState({ lastPlaybackLocators }, () => {
            if (this.isPlaying && continuePlayback) {
                this.loopr.setLoopFromLocators(this.getTrueLocators(lastPlaybackLocators));
            } else {
                this.loopr.play(this.getTrueLocators(lastPlaybackLocators));
                if (!this.isPlaying) {
                    this.isPlaying = true;
                    window.requestAnimationFrame(this.animatePlayback);
                }
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
