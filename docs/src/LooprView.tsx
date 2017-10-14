import * as React from 'react';

interface LooprViewProps {
    width: number;
    height: number;
    audioBuffer?: AudioBuffer;
}

interface LooprViewState {
    leftChannelData: Float32Array;
    rightChannelData: Float32Array;
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
        const { audioBuffer: currBuffer } = this.props;
        const { audioBuffer: nextBuffer, width } = nextProps;
        if (nextBuffer !== currBuffer) {
            this.hydrateChannelData(nextBuffer, () => this.plotWaveform(width));
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
                    height={200}
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
        this.setState({ leftChannelData, rightChannelData }, callback);
    }

    private plotWaveform = (width: number) => {
        const { leftChannelData, rightChannelData } = this.state;
        const context = this.canvas && this.canvas.getContext('2d');
        if (!leftChannelData || leftChannelData.length === 0 || !context) { return; }
        
    }
}

export { LooprView };
