import * as React from 'react';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';
import { Player } from './player';

const PLAYBACK_BAR_WIDTH = 5;
const HEADER_HEIGHT = 70;
const CANVAS_HEIGHT_PERCENT = 0.7;
const MIN_LOOP_PERCENT = 0.001;
const DEFAULT_LOCATORS: Locators = { startPercent: 0, endPercent: 1 };
const GET_CANVAS_HEIGHT = height => (height - HEADER_HEIGHT) * CANVAS_HEIGHT_PERCENT;

export interface Locators {
  startPercent?: number;
  endPercent?: number;
}

interface WaveformRect {
  x: number;
  y: number;
  width: number;
  height: number;
  sampleIndex: number;
}

interface PlaybackRenderInfo {
  startPixel: number;
  endPixel: number;
  zoomFactor: number;
}

enum Locator {
  Start = 'Start',
  End = 'End',
}

interface TrackProps {
  width: number;
  height: number;
  audioBuffer?: AudioBuffer;
  player: Player;
  alpha: number;
}

interface TrackState {
  leftChannelData: Float32Array;
  rightChannelData: Float32Array;
  lowPeak: number;
  highPeak: number;
  zoomLocators: Locators;
  loopLocators: Locators;
  shiftLocator: Locator;
  waveformRects: WaveformRect[];
  mouseDownX: number;
}

class Track extends React.Component<TrackProps, Partial<TrackState>> {
  private canvas: HTMLCanvasElement = null;
  private isPlaying: boolean = false;
  private lastProgressSeconds: number = null;
  private additionalPlaybackProgressSeconds: number = 0;
  private lastRenderTime: number = null;

  constructor(props: TrackProps) {
    super(props);
    this.state = { loopLocators: DEFAULT_LOCATORS, waveformRects: [] };
  }

  public componentWillMount() {
    const { audioBuffer } = this.props;
    if (audioBuffer) {
      this.setChannelData(audioBuffer);
      this.props.player.alpha = this.props.alpha;
    }
  }

  public componentDidMount() {
    this.subscribeToWindowMouseEvents();
    window.addEventListener('keydown', this.onKeyDown);
    this.setState({ waveformRects: this.getWaveformRects() }, this.draw);
  }

  public componentWillUnmount() {
    this.UnsubscribeFromWindowMouseEvents();
    window.removeEventListener('keydown', this.onKeyDown);
  }

  public componentWillReceiveProps(nextProps: TrackProps) {
    const { audioBuffer, height, player } = this.props;
    if (nextProps.audioBuffer !== audioBuffer) {
      this.setChannelData(nextProps.audioBuffer);
    }

    if (nextProps.alpha !== this.props.alpha) {
      player.alpha = nextProps.alpha;
    }
  }

  public componentDidUpdate(prevProps: TrackProps, prevState: TrackState) {
    if (this.state.zoomLocators !== prevState.zoomLocators || this.props.width !== prevProps.width) {
      this.setState({ waveformRects: this.getWaveformRects() }, this.draw);
      return;
    }

    if (this.state.loopLocators !== prevState.loopLocators) {
      this.props.player.setLoop(this.getTrueLocators(this.getRelativeLocators(this.state.loopLocators)));
    }

    if (!this.isPlaying) {
      this.draw();
    }
  }

  public render() {
    const { width, height } = this.props;
    return (
      <canvas
        ref={canvas => this.canvas = canvas}
        width={width}
        height={height}
        style={{
          backgroundColor: Color.MID_BLUE,
          cursor: 'text',
        }}
        onMouseDown={this.onMouseDown}
      />
    );
  }

  // MOUSE EVENTS

  private onMouseDown: React.MouseEventHandler<HTMLCanvasElement> = e => {
    const { width } = this.props;
    const { startPercent, endPercent } = this.getRelativeLocators();
    const { left } = this.canvas.getBoundingClientRect();
    const x = e.clientX - left;
    const mouseDownPercent = x / width;
    const isRemovingStartLocator = Math.abs(startPercent - mouseDownPercent) <= MIN_LOOP_PERCENT;
    const midX = (startPercent + ((endPercent - startPercent) * 0.5)) * width;
    if (e.shiftKey && startPercent !== 0 && endPercent === 1) {
      if (x >= midX) {
        this.setState({
          mouseDownX: x,
          shiftLocator: Locator.End,
          loopLocators: {
            startPercent,
            endPercent: mouseDownPercent,
          },
        });
      } else {
        this.setState({
          mouseDownX: x,
          shiftLocator: Locator.Start,
          loopLocators: {
            startPercent: mouseDownPercent,
            endPercent: startPercent,
          },
        });
      }
    } else if (e.shiftKey && startPercent !== 0 && endPercent !== 1) {
      if (x >= midX) {
        this.setState({
          mouseDownX: x,
          shiftLocator: Locator.End,
          loopLocators: {
            startPercent,
            endPercent: mouseDownPercent,
          },
        });
      } else {
        this.setState({
          mouseDownX: x,
          shiftLocator: Locator.Start,
          loopLocators: {
            startPercent: mouseDownPercent,
            endPercent,
          },
        });
      }
    } else {
      this.setState({
        mouseDownX: x,
        shiftLocator: null,
        loopLocators: {
          startPercent: isRemovingStartLocator ? 0 : mouseDownPercent,
          endPercent: 1,
        },
      }, () => isRemovingStartLocator && this.stopPlayback());
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    const { shiftLocator, loopLocators: { startPercent, endPercent }, mouseDownX } = this.state;
    if (mouseDownX !== null) {
      const { width } = this.props;
      const { left } = this.canvas.getBoundingClientRect();
      const x = e.clientX - left;
      if (shiftLocator !== null) {
        this.setState({
          loopLocators: {
            startPercent: shiftLocator === Locator.Start ? x / width : startPercent,
            endPercent: shiftLocator === Locator.End ? x / width : endPercent,
          },
        });
      } else {
        this.handleMouse(e.clientX, startPercent);
      }
    }
  }

  private onMouseUp = (e: MouseEvent) => {
    const { loopLocators, mouseDownX } = this.state;
    if (loopLocators && mouseDownX !== null) {
      this.handleMouse(e.clientX, loopLocators.startPercent, true);
    }
  }

  private handleMouse = (clientX: number, startPercent: number, isMouseUp = false) => {
    const { width, player } = this.props;
    const { shiftLocator, loopLocators: { endPercent: originalEndPercent } } = this.state;
    if (startPercent === 0 && originalEndPercent === 1) { return; }
    const { left } = this.canvas.getBoundingClientRect();
    const x = clientX - left;
    const calculatedEndPercent = x / width;
    const endPercent = !shiftLocator || shiftLocator !== Locator.Start ? (Math.abs(startPercent - calculatedEndPercent) > MIN_LOOP_PERCENT ? calculatedEndPercent : 1) : originalEndPercent;
    this.setState({
      mouseDownX: !isMouseUp ? x : null,
      shiftLocator: isMouseUp ? null : shiftLocator,
      loopLocators: { startPercent, endPercent }, // this.getRelativeLocators({ startPercent, endPercent }),
    });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      switch (e.keyCode) {
        case Constant.Key.SHIFT:
          break;
        case Constant.Key.Z:
          return e.shiftKey ? this.zoomOut() : this.zoomIn(this.getTrueLocators(this.getRelativeLocators()));
        case Constant.Key.SPACE:
          return e.shiftKey ? this.stopPlayback() : this.startPlayback();
        case Constant.Key.ESCAPE:
          return this.stopPlayback();
      }
    }
  }

  // PRIVATE METHODS

  private draw = () => {
    const context = this.canvas.getContext('2d');
    const { width, height } = this.props;
    context.clearRect(0, 0, width, height);
    const playbackRenderInfo = this.getPlaybackRenderInfo();
    this.drawWaveform(context, playbackRenderInfo);
    this.drawLocators(context);
    this.drawTimeIndicators(context);
    if (playbackRenderInfo !== null) {
      this.drawPlaybackProgress(context, playbackRenderInfo);
    }
  }

  private subscribeToWindowMouseEvents = () => {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  private UnsubscribeFromWindowMouseEvents = () => {
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
  }

  private zoomIn = (zoomLocators: Locators) => this.setChannelData(this.props.audioBuffer, zoomLocators);

  private zoomOut = () => {
    if (this.state.zoomLocators === DEFAULT_LOCATORS) { return; }
    const loopLocators = this.getTrueLocators(this.state.loopLocators);
    this.setChannelData(this.props.audioBuffer, DEFAULT_LOCATORS, loopLocators);
  }

  private setChannelData = (audioBuffer: AudioBuffer, zoomLocators: Locators = DEFAULT_LOCATORS, loopLocators: Locators = DEFAULT_LOCATORS) => {
    const getSubArray = (channelData: Float32Array): Float32Array => channelData.slice(
      Math.round(channelData.length * zoomLocators.startPercent),
      Math.round(channelData.length * zoomLocators.endPercent),
    );
    const leftChannelData = getSubArray(audioBuffer.getChannelData(0));
    const rightChannelData = audioBuffer.numberOfChannels > 1 ? getSubArray(audioBuffer.getChannelData(1)) : null;
    const { lowPeak, highPeak } = this.getPeaks(leftChannelData, rightChannelData || undefined);
    this.setState({
      leftChannelData,
      rightChannelData,
      lowPeak,
      highPeak,
      zoomLocators,
      loopLocators,
    });
  }

  private getPeaks = (...channels: Float32Array[]): { highPeak: number, lowPeak: number } => {
    let lowPeak = 0;
    let highPeak = 0;
    channels.filter(c => c).forEach(channelData => channelData.forEach(amplitude => {
      if (amplitude < lowPeak) { lowPeak = amplitude; }
      if (amplitude > highPeak) { highPeak = amplitude; }
    }));
    return { lowPeak, highPeak };
  }

  private log10 = x => Math.log(x) * Math.LOG10E;
  private roundHalf = x => Math.round(x * 2) / 2;

  private drawWaveform = (context: CanvasRenderingContext2D, playbackRenderInfo: PlaybackRenderInfo) => { // TODO: color waveform differently when within loop boundaries or playback progress boundaries...
    const { waveformRects } = this.state;
    let startPixel: number;
    let playbackProgressEndPixel: number;
    if (playbackRenderInfo !== null) {
      ({ startPixel } = playbackRenderInfo);
      const { endPixel, zoomFactor } = playbackRenderInfo;
      const playbackProgressWidth = (endPixel - startPixel) * zoomFactor;
      playbackProgressEndPixel = startPixel + playbackProgressWidth;
    }

    waveformRects.forEach(waveformRect => {
      const { x, y, width, height } = waveformRect;
      context.fillStyle = Color.DARK_BLUE;
      if (playbackRenderInfo && x >= startPixel && x <= playbackProgressEndPixel) {
        context.fillStyle = Color.WHITE;
      }
      context.fillRect(x, y, width, height);
    });
  }

  private getWaveformRects = (): WaveformRect[] => {
    const { leftChannelData, rightChannelData, lowPeak, highPeak } = this.state;
    const { width, height } = this.props;
    const pixelCount = width * 2;
    const peak = Math.max(Math.abs(lowPeak), highPeak);
    const NORMALIZE_FACTOR = (rightChannelData ? height * 0.25 : height * 0.5) / peak;
    const DECIMATION_FACTOR = leftChannelData.length / pixelCount;
    const waveformRects: WaveformRect[] = [];

    const drawChannel = (channelData: Float32Array, midY: number) => {
      for (let i = 0; i <= width; i += 0.5) {
        const sampleIndex = Math.round((i * 2) * DECIMATION_FACTOR);
        const amplitude = Math.abs(channelData[sampleIndex] * NORMALIZE_FACTOR);
        waveformRects.push({
          x: i,
          y: midY - amplitude,
          width: 0.5,
          height: amplitude * 2,
          sampleIndex,
        });
      }
    };

    drawChannel(leftChannelData, rightChannelData ? height * 0.25 : height * 0.5);
    if (rightChannelData) { drawChannel(rightChannelData, height * 0.75); }

    return waveformRects;
  }

  private drawLocators = (context: CanvasRenderingContext2D) => {
    const { startPercent, endPercent } = this.getRelativeLocators();
    const { width, height } = this.props;
    const { mouseDownX } = this.state;
    if (startPercent >= 0 && !(startPercent === 0 && endPercent === 1)) {
      context.fillStyle = Color.CURSOR_COLOR;
      const leftLocatorX = width * startPercent;
      context.fillRect(leftLocatorX, 0, 1, height);
      if (endPercent < 1 || (mouseDownX !== null && mouseDownX >= width)) {
        const rightLocatorX = width * endPercent;
        context.fillRect(rightLocatorX, 0, 1, height);
        context.fillStyle = Color.SELECTION_COLOR;
        const startX = leftLocatorX + 1;
        const endX = rightLocatorX;
        context.fillRect(startX, 0, endX - startX, height);
      }
    }
  }

  private drawPlaybackProgress = (context: CanvasRenderingContext2D, { startPixel, endPixel, zoomFactor }: PlaybackRenderInfo) => {
    context.fillStyle = Color.SELECTION_COLOR;
    context.fillRect(startPixel, 0, (endPixel - startPixel) * zoomFactor, this.props.height);
  }

  private drawTimeIndicators = (context: CanvasRenderingContext2D) => {
    const { width, height, player: { playbackProgressSeconds, loopStartSeconds, loopEndSeconds } } = this.props;
    context.fillStyle = Color.DARK_BLUE;
    context.textBaseline = 'bottom';
    context.textAlign = 'right';
    context.font = '20px \'Open Sans\', sans-serif';
    const playbackSeconds = loopStartSeconds + (playbackProgressSeconds === null ? 0 : playbackProgressSeconds + this.additionalPlaybackProgressSeconds);
    const playbackText = Constant.SECONDS_TO_HHMMSSMM(playbackSeconds);
    context.fillText(playbackText, width - Constant.PADDING, height - Constant.PADDING);
    if (loopStartSeconds !== null && loopEndSeconds !== null) {
      context.textAlign = 'left';
      const loopStartText = Constant.SECONDS_TO_HHMMSSMM(loopStartSeconds);
      const loopEndText = Constant.SECONDS_TO_HHMMSSMM(loopEndSeconds);
      context.fillText(`${loopStartText}   ${loopEndText}`, Constant.PADDING, height - Constant.PADDING);
    }
  }

  private updateIntraFrameInfo = () => {
    const { player } = this.props;
    if (this.lastProgressSeconds && this.lastRenderTime) {
      if (this.lastProgressSeconds === player.playbackProgressSeconds) {
        const secondsSinceLastRender = (window.performance.now() - this.lastRenderTime) / 1000;
        const estimatedSamplesProcessedSinceLastRender = secondsSinceLastRender * player.audioContext.sampleRate;
        this.additionalPlaybackProgressSeconds += ((estimatedSamplesProcessedSinceLastRender / player.audioContext.sampleRate) / player.alpha);
      } else {
        this.additionalPlaybackProgressSeconds = 0;
        this.lastProgressSeconds = player.playbackProgressSeconds;
      }
    } else {
      this.lastProgressSeconds = player.playbackProgressSeconds;
    }

    if ((player.playbackProgressSeconds + this.additionalPlaybackProgressSeconds) >= (player.loopEndSeconds - player.loopStartSeconds)) {
      player.position = player.loopStartPercent * player.buffer.length;
      player.playbackProgressSeconds = 0;
    }

    this.lastRenderTime = window.performance.now();
  }

  private getPlaybackRenderInfo = (): PlaybackRenderInfo => {
    const { player, width } = this.props;
    if (!this.isPlaying) { return null; }
    const { loopLocators, zoomLocators: { startPercent: zoomStartPercent, endPercent: zoomEndPercent } } = this.state;
    const { startPercent: trueLocatorStartPercent, endPercent: trueLocatorEndPercent } = this.getTrueLocators(loopLocators);
    const { startPercent: relativeLocatorStartPercent } = this.getRelativeLocators(loopLocators);
    const zoomFactor = 1 / (zoomEndPercent - zoomStartPercent);
    const progressPercent = (player.playbackProgressSeconds + this.additionalPlaybackProgressSeconds) / player.buffer.duration;
    const progressWidth = (width * progressPercent) % ((width * trueLocatorEndPercent) - (width * trueLocatorStartPercent));
    const startPixel = width * relativeLocatorStartPercent;
    const endPixel = startPixel + progressWidth;
    return { startPixel, endPixel, zoomFactor };
  }

  private getRelativeLocators = ({ startPercent: l1, endPercent: l2 }: Locators = this.state.loopLocators): Locators => {
    const startPercent = Math.min(l1, l2);
    const endPercent = Math.max(l1, l2);
    return { startPercent, endPercent };
  }

  private getTrueLocators = ({ startPercent, endPercent }: Locators): Locators => {
    const { zoomLocators: { startPercent: zoomStart, endPercent: zoomEnd } } = this.state;
    const trueStart = zoomStart + ((zoomEnd - zoomStart) * startPercent);
    const trueEnd = zoomStart + ((zoomEnd - zoomStart) * endPercent);
    return { startPercent: trueStart, endPercent: trueEnd };
  }

  private startPlayback = () => {
    this.props.player.play();
    if (!this.isPlaying) {
      this.isPlaying = true;
      window.requestAnimationFrame(this.animatePlayback);
    }
  }

  private stopPlayback = () => {
    this.props.player.stop();
    this.isPlaying = false;
  }

  private animatePlayback: FrameRequestCallback = () => {
    this.updateIntraFrameInfo();
    this.draw();
    if (this.isPlaying) {
      window.requestAnimationFrame(this.animatePlayback);
    }
  }
}

export { Track };
