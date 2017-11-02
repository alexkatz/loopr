import * as React from 'react';
import { Player } from './player';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';
import { Track } from './Track';

const HEADER_HEIGHT = 70;
const CANVAS_HEIGHT_PERCENT = 0.7;
const GET_CANVAS_HEIGHT = height => (height - HEADER_HEIGHT) * CANVAS_HEIGHT_PERCENT;

interface InterfaceProps {
  width: number;
  height: number;
  audioBuffer?: AudioBuffer;
  player: Player;
}

interface InterfaceState {

}

class Interface extends React.Component<InterfaceProps, InterfaceState> {

  public render() {
    const { width, height, audioBuffer, player } = this.props;
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
          TimeStretcher
        </div>
        <Track
          width={width}
          height={GET_CANVAS_HEIGHT(height)}
          audioBuffer={audioBuffer}
          player={player}
        />
      </div>
    );
  }
}

export { Interface };
