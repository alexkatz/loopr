import * as React from 'react';
import { Style } from '../shared/styles';
import { Color } from '../shared/colors';
import { Constant } from '../shared/constants';

const Welcome: React.StatelessComponent<{ width: number }> = ({ width }) => (
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
                color: Color.MID_BLUE,
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
                color: Color.MID_BLUE,
                cursor: 'default',
            }}
        >
            Click anywhere, or drag an audio file in
        </div>
    </div>
);

export { Welcome };
