import * as React from 'react';
import { AutoSizer } from 'react-virtualized';
import { DropzoneProps, DropFilesEventHandler } from 'react-dropzone';
import { Color } from './shared/colors';
import { Constant } from './shared/constants';
import { Style } from './shared/styles';
import { Loopr, RemoveListener } from './loopr';
import { LooprView } from './LooprView';
import { WelcomeView } from './shared/WelcomeView';
const Dropzone = require('react-dropzone').default as React.ComponentType<DropzoneProps>;

interface HomeState {
    audioBuffer: AudioBuffer;
}

class Home extends React.Component<any, HomeState> {
    private loopr = new Loopr();
    private removeListeners: RemoveListener[] = [];

    constructor(props: any) {
        super(props);
        this.state = { audioBuffer: null };
    }

    public componentWillMount() {
        this.removeListeners.push(
            this.loopr.onAudioBufferChanged(audioBuffer => this.setState({ audioBuffer })),
        );
    }

    public componentWillUnmount() {
        this.removeListeners.forEach(removeListener => removeListener());
    }

    public render() {
        const { audioBuffer } = this.state;
        return (
            <AutoSizer>
                {({ width, height }) => (
                    <div
                        style={{
                            width,
                            height,
                            backgroundColor: Color.LIGHT_BLUE,
                        }}
                    >
                        <Dropzone
                            onDrop={([file]) => this.loopr.setAudioFile(file)}
                            accept={'audio/*'}
                            disableClick={audioBuffer != null}
                            style={{
                                width: '100%',
                                height: '100%',
                            } as React.CSSProperties}
                        >
                            {!audioBuffer && (<WelcomeView width={width} />)}
                            {audioBuffer && (
                                <LooprView
                                    width={width}
                                    height={height}
                                    audioBuffer={audioBuffer}
                                />
                            )}
                        </Dropzone>
                    </div>
                )}
            </AutoSizer>
        );
    }
}

export { Home };
