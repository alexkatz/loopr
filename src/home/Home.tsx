import * as React from 'react';
import { AutoSizer } from 'react-virtualized';
import { DropzoneProps, DropFilesEventHandler } from 'react-dropzone';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';
import { Style } from '../shared/styles';
import { Player, RemoveListener } from '../interface/player';
import { Interface } from '../interface/Interface';
import { Welcome } from './Welcome';
const Dropzone = require('react-dropzone').default as React.ComponentType<DropzoneProps>;

interface HomeState {
    audioBuffer: AudioBuffer;
}

class Home extends React.Component<any, HomeState> {
    private player = new Player();
    private removeListeners: RemoveListener[] = [];

    constructor(props: any) {
        super(props);
        this.state = { audioBuffer: null };
    }

    public componentWillMount() {
        this.removeListeners.push(
            this.player.onAudioBufferChanged(audioBuffer => this.setState({ audioBuffer })),
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
                            onDrop={([file]) => this.player.setAudioFile(file)}
                            accept={'audio/x-m4a, audio/mp3, audio/x-wav'}
                            disableClick={audioBuffer != null}
                            style={{
                                width: '100%',
                                height: '100%',
                            } as React.CSSProperties}
                        >
                            {!audioBuffer && (<Welcome width={width} />)}
                            {audioBuffer && (
                                <Interface
                                    width={width}
                                    height={height}
                                    audioBuffer={audioBuffer}
                                    player={this.player}
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
