import * as React from 'react';
import { Style } from './styles';
import { Color } from './colors';
import { Constant } from './constants';

const WelcomeView: React.StatelessComponent<{ width: number }> = ({ width }) => (
    <div
        style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            ...Style.NO_SELECT,
        }}
    >
        <div
            style={{
                flex: '25%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.min(Math.round(width / 10), 70),
                color: Color.DARK_BLUE,
                cursor: 'default',
            }}
        >
            Loopr
        </div>
        <div
            style={{
                flex: '75%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.min(Math.round(width / 20), 50),
                fontWeight: Constant.FontWeight.LIGHT,
                color: Color.DARK_BLUE,
                cursor: 'default',
            }}
        >
            Click anywhere, or drag an audio file in
        </div>
    </div>
);

export { WelcomeView };
