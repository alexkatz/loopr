import * as React from 'react';
import { AutoSizer } from 'react-virtualized';
import { DropzoneProps, DropFilesEventHandler } from 'react-dropzone';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';
import { Style } from '../shared/styles';
import { Loopr, RemoveListener } from '../loopr/loopr';
import { LooprInterface } from '../loopr/LooprInterface';
import { Welcome } from './Welcome';
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
                            accept={'audio/x-m4a, audio/mp3, audio/x-wav'}
                            disableClick={audioBuffer != null}
                            style={{
                                width: '100%',
                                height: '100%',
                            } as React.CSSProperties}
                        >
                            {!audioBuffer && (<Welcome width={width} />)}
                            {audioBuffer && (
                                <LooprInterface
                                    width={width}
                                    height={height}
                                    audioBuffer={audioBuffer}
                                    loopr={this.loopr}
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
