import * as React from 'react';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';

interface AlphaSliderProps {
  style?: React.CSSProperties;
  maxAlpha: number;
  minAlpha: number;
  alpha: number;
  width: number;
  onAlphaChange(alpha: number);
}

interface AlphaSliderState {

}

class AlphaSlider extends React.Component<AlphaSliderProps, AlphaSliderState> {
  private containerDiv: HTMLDivElement = null;
  private isMouseDown: boolean = false;

  constructor(props: AlphaSliderProps) {
    super(props);
    this.state = {
      isMouseDown: false,
    };
  }

  public componentDidMount() {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  public componentWillUnmount() {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  public render() {
    const { style, width, alpha } = this.props;
    return (
      <div
        ref={node => this.containerDiv = node}
        onMouseDown={this.onMouseDown}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          ...style,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: width * this.getCurrentPercent(),
            backgroundColor: Color.SELECTION_COLOR,
          }}
        />
        <div
          style={{
            paddingRight: Constant.PADDING,
          }}
        >
          {((1 / alpha) * 100).toFixed(2) + '%'}
        </div>
      </div>
    );
  }

  private getCurrentPercent = () => {
    const { maxAlpha, minAlpha, alpha } = this.props;
    const alphaDelta = maxAlpha - minAlpha;
    const currentAlphaDelta = alpha - minAlpha;
    let percent = currentAlphaDelta / alphaDelta;
    if (percent < 0) { percent = 0; }
    if (percent > 1) { percent = 1; }
    return percent;
  }

  private onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    this.isMouseDown = true;
    this.handleMouse(e as any);
  }

  private onMouseMove = (e: MouseEvent) => {
    if (this.isMouseDown) {
      this.handleMouse(e);
    }
  }

  private onMouseUp = (e: MouseEvent) => {
    if (this.isMouseDown) {
      this.isMouseDown = false;
      this.handleMouse(e);
    }
  }

  private handleMouse = (e: MouseEvent) => {
    const { width, maxAlpha, minAlpha, onAlphaChange } = this.props;
    const { left } = this.containerDiv.getBoundingClientRect();
    const alphaDelta = maxAlpha - minAlpha;
    const x = e.clientX - left;
    const percent = x / width;
    let alpha = (alphaDelta * percent) + minAlpha;
    if (alpha < minAlpha) { alpha = minAlpha; }
    if (alpha > maxAlpha) { alpha = maxAlpha; }
    onAlphaChange(alpha);
  }
}

export { AlphaSlider };
