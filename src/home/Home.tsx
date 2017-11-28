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

interface ReadResult {
    done: boolean;
    value?: any;
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

    // public async componentDidMount() {
    //     const result = await Constant.GET_YOUTUBE_AUDIO('https://www.youtube.com/watch?v=le0BLAEO93g');
    //     if (result) {
    //         const reader = result.getReader();
    //         let readResult: ReadResult = { done: false };
    //         const arrays: Uint8Array[] = [];
    //         let length = 0;
    //         while (!readResult.done) {
    //             readResult = await reader.read();
    //             if (!readResult.done) {
    //                 const array = readResult.value;
    //                 arrays.push(array);
    //                 length += array.length;
    //             }
    //         }

    //         const array = new Uint8Array(length);
    //         arrays.reduce((length, arr) => {
    //             array.set(arr, length);
    //             return length += arr.length;
    //         }, 0);

    //         this.player.setAudioFromBuffer(array.buffer);
    //     }
    // }

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
                            onDrop={([file]) => this.player.setAudioFromFile(file)}
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
