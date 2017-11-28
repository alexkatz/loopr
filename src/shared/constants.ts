import { Locators } from '../interface/Track';

const HEADER_HEIGHT = 70;
const CANVAS_HEIGHT_PERCENT = 0.7;
const MIN_ALPHA = 0.5;
const MAX_ALPHA = 5;
const GET_CANVAS_HEIGHT = (height: number): number => (height - HEADER_HEIGHT) * CANVAS_HEIGHT_PERCENT;
const GET_ALPHA_FROM_SLIDER_PERCENT = (sliderPercent: number): number => MIN_ALPHA + ((MAX_ALPHA - MIN_ALPHA) * sliderPercent);
const GET_ALPHA_FROM_ALPHA_PERCENT = (alphaPercent: number): number => 1 / alphaPercent;
const GET_SLIDER_PERCENT_FROM_ALPHA = (alpha: number): number => (alpha - MIN_ALPHA) / (MAX_ALPHA - MIN_ALPHA);
const GET_ALPHA_PERCENT_FROM_SLIDER_PERCENT = (sliderPercent: number): number => 1 / GET_ALPHA_FROM_SLIDER_PERCENT(sliderPercent);
const LOCATORS_ARE_EQUAL = (a: Locators, b: Locators): boolean => a.startPercent === b.startPercent && a.endPercent === b.endPercent;

const ENSURE_RANGE_INCLUSIVE = (n: number): number => {
    if (n < 0) { return 0; }
    if (n > 1) { return 1; }
    return n;
};

const SECONDS_TO_HHMMSSMM = (n: number): string => {
    const HOUR_SECONDS = 3600;
    const MINUTE_SECONDS = 60;
    const hours = Math.floor(n / HOUR_SECONDS);
    const minutes = Math.floor((n - (hours * HOUR_SECONDS)) / MINUTE_SECONDS);
    const seconds = n - (hours * HOUR_SECONDS) - (minutes * MINUTE_SECONDS);
    const milliseconds = Math.floor((seconds % 1) * 100);
    const secondsFloored = Math.floor(seconds);
    const hh = hours < 10 ? `0${hours}` : hours;
    const mm = minutes < 10 ? `0${minutes}` : minutes;
    const ss = secondsFloored < 10 ? `0${secondsFloored}` : secondsFloored;
    const mmm = milliseconds < 10 ? `0${milliseconds}` : milliseconds;
    return `${hours > 0 ? `${hh}:` : ''}${mm}:${ss}:${mmm}`;
};

const GET_YOUTUBE_AUDIO = async (url: string): Promise<ReadableStream> => {
    try {
        const result = await fetch(`http://localhost:3001/audio?url=${url}`);
        return result.body;
    } catch (error) {
        console.log(error);
        return null;
    }
};

export const Constant = {
    FontWeight: {
        LIGHT: 300 as 300,
        REGULAR: 400 as 400,
    },
    PADDING: 8,
    Key: {
        SPACE: 32,
        SHIFT: 16,
        Z: 90,
        ESCAPE: 27,
        S: 83,
    },
    NO_OP: (() => { }) as () => void,
    HEADER_HEIGHT,
    CANVAS_HEIGHT_PERCENT,
    LOCATORS_ARE_EQUAL,
    MIN_ALPHA,
    MAX_ALPHA,
    GET_CANVAS_HEIGHT,
    GET_ALPHA_FROM_SLIDER_PERCENT,
    GET_ALPHA_FROM_ALPHA_PERCENT,
    GET_SLIDER_PERCENT_FROM_ALPHA,
    GET_ALPHA_PERCENT_FROM_SLIDER_PERCENT,
    ENSURE_RANGE_INCLUSIVE,
    SECONDS_TO_HHMMSSMM,
    GET_YOUTUBE_AUDIO,
};
