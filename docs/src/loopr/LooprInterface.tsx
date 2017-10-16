import * as React from 'react';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';

const CANVAS_HEIGHT = 200;

interface LooprViewProps {
    width: number;
    height: number;
    audioBuffer?: AudioBuffer;
}

interface LooprViewState {
    leftChannelData: Float32Array;
    rightChannelData: Float32Array;
    lowPeak: number;
    highPeak: number;
    leftLocatorPercent: number;
    rightLocatorPercent: number;
    isMouseDown: boolean;
}

class LooprInterface extends React.Component<LooprViewProps, LooprViewState> {
    private canvas: HTMLCanvasElement = null;

    public componentWillMount() {
        const { audioBuffer } = this.props;
        if (audioBuffer) {
            this.hydrateChannelData(audioBuffer);
        }
    }

    public componentDidMount() {
        this.subscribeToWindowMouseEvents();
        this.draw();
    }

    public componentWillUnmount() {
        this.UnsubscribeFromWindowMouseEvents();
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
        this.setState({ leftLocatorPercent: x / width, isMouseDown: true });
    }

    private onMouseMove = (e: MouseEvent) => {
        const { leftLocatorPercent, isMouseDown } = this.state;
        if (isMouseDown) {
            const { width } = this.props;
            const { left } = this.canvas.getBoundingClientRect();
            const x = e.clientX - left;
            const rightLocatorPercent = x / width;
            this.setState({ rightLocatorPercent: Math.abs(leftLocatorPercent - rightLocatorPercent) > .01 ? rightLocatorPercent : null });
        }
    }

    private onMouseUp = (e: MouseEvent) => {
        const { width } = this.props;
        const { leftLocatorPercent } = this.state;
        const { left } = this.canvas.getBoundingClientRect();
        const x = e.clientX - left;
        const rightLocatorPercent = x / width;
        this.setState({ isMouseDown: false, rightLocatorPercent: Math.abs(leftLocatorPercent - rightLocatorPercent) > .01 ? rightLocatorPercent : null });
    }

    // PRIVATE METHODS

    private draw() {
        const context = this.canvas.getContext('2d');
        const { width } = this.props;
        context.clearRect(0, 0, width, CANVAS_HEIGHT);
        this.plotWaveform(context, width);
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
        const rightChannelData = audioBuffer.getChannelData(1);
        const { lowPeak, highPeak } = this.getPeaks(leftChannelData, rightChannelData);
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

    private plotWaveform = (context: CanvasRenderingContext2D, width: number) => {
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
}

export { LooprInterface };
