import * as React from 'react';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';
import { Style } from '../shared/styles';

interface PercentSliderProps {
  style?: React.CSSProperties;
  percent: number;
  width: number;
  onPercentChange(percent: number);
  onLabelChange?(value: string);
  labelValue?: string;
}

class PercentSlider extends React.Component<PercentSliderProps> {
  private containerDiv: HTMLDivElement = null;
  private isMouseDown: boolean = false;

  constructor(props: PercentSliderProps) {
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
    const { style, width, percent, labelValue } = this.props;
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
            width: width * percent,
            backgroundColor: Color.SELECTION_COLOR,
          }}
        />
        <div
          style={{
            paddingRight: Constant.PADDING,
            ...Style.NO_SELECT,
          }}
        >
          {labelValue}
        </div>
      </div>
    );
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
    const { width, onPercentChange } = this.props;
    const { left } = this.containerDiv.getBoundingClientRect();
    const x = e.clientX - left;
    let percent = x / width;
    if (percent > 1) { percent = 1; }
    if (percent < 0) { percent = 0; }
    onPercentChange(percent);
  }
}

export { PercentSlider };
