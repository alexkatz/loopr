import * as React from 'react';
import { Player } from './player';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';
import { Track } from './Track';
import { AlphaSlider } from './AlphaSlider';
import { Style } from '../shared/styles';

interface InterfaceProps {
  width: number;
  height: number;
  audioBuffer?: AudioBuffer;
  player: Player;
}

interface InterfaceState {
  alpha: number;
}

class Interface extends React.Component<InterfaceProps, InterfaceState> {
  constructor(props: InterfaceProps) {
    super(props);
    this.state = { alpha: 1 };
  }

  public render() {
    const { width, height, audioBuffer, player } = this.props;
    const { alpha } = this.state;
    return (
      <div
        style={{
          width,
          height,
        }}
      >
        <div
          style={{
            position: 'relative',
            color: Color.MID_BLUE,
            fontWeight: Constant.FontWeight.REGULAR,
            fontSize: 30,
            height: Constant.HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: Constant.PADDING,
            ...Style.NO_SELECT,
          }}
        >
          AudioStretcher
          <AlphaSlider
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
            alpha={alpha}
            width={width}
            onAlphaChange={alpha => this.setState({ alpha })}
          />
        </div>
        <Track
          width={width}
          height={Constant.GET_CANVAS_HEIGHT(height)}
          audioBuffer={audioBuffer}
          player={player}
          alpha={alpha}
        />
      </div>
    );
  }
}

export { Interface };
