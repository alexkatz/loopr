import * as React from 'react';

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
}

class LooprView extends React.Component<LooprViewProps, LooprViewState> {
    private canvas: HTMLCanvasElement = null;

    public componentWillMount() {
        const { audioBuffer } = this.props;
        if (audioBuffer) {
            this.hydrateChannelData(audioBuffer);
        }
    }

    public componentDidMount() {
        this.plotWaveform(this.props.width);
    }

    public componentWillReceiveProps(nextProps: LooprViewProps) {
        const { audioBuffer: currBuffer, width: prevWidth } = this.props;
        const { audioBuffer: nextBuffer, width: nextWidth } = nextProps;
        if (nextBuffer !== currBuffer) {
            this.hydrateChannelData(nextBuffer);
        }
    }

    public componentDidUpdate(prevProps: LooprViewProps) {
        const { width: currWidth, audioBuffer: currAudioBuffer } = this.props;
        const { width: prevWidth, audioBuffer: prevAudioBuffer } = prevProps;
        if (currWidth !== prevWidth || currAudioBuffer !== prevAudioBuffer) {
            this.plotWaveform(currWidth);
        }
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
                <canvas
                    ref={canvas => this.canvas = canvas}
                    width={width}
                    height={CANVAS_HEIGHT}
                    style={{
                        marginTop: 40,
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    }}
                />
            </div>
        );
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

    private plotWaveform = (width: number) => {
        const pixelCount = width * 2;
        const { leftChannelData, rightChannelData, lowPeak, highPeak } = this.state;
        const context = this.canvas && this.canvas.getContext('2d');
        if (!leftChannelData || leftChannelData.length === 0 || !context) { return; }

        const MID_Y = CANVAS_HEIGHT / 2;
        const peak = Math.max(Math.abs(lowPeak), highPeak);
        const NORMALIZE_FACTOR = (CANVAS_HEIGHT / peak);
        const DECIMATION_FACTOR = leftChannelData.length / pixelCount;
        context.clearRect(0, 0, width, CANVAS_HEIGHT);
        context.fillRect(0, MID_Y, width, 1);
        for (let i = 0; i < width; i += 0.5) {
            const amplitude = Math.abs(leftChannelData[Math.round((i * 2) * DECIMATION_FACTOR)] * NORMALIZE_FACTOR);
            context.fillRect(i, MID_Y - amplitude, 1, amplitude * 2);
        }
    }
}

export { LooprView };
