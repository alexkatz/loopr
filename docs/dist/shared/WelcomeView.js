"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var styles_1 = require("./styles");
var colors_1 = require("./colors");
var constants_1 = require("./constants");
var WelcomeView = function (_a) {
    var width = _a.width;
    return (React.createElement("div", { style: __assign({ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }, styles_1.Style.NO_SELECT) },
        React.createElement("div", { style: {
                flex: '25%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.min(Math.round(width / 10), 70),
                color: colors_1.Color.DARK_BLUE,
                cursor: 'default',
            } }, "Loopr"),
        React.createElement("div", { style: {
                flex: '75%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.min(Math.round(width / 20), 50),
                fontWeight: constants_1.Constant.FontWeight.LIGHT,
                color: colors_1.Color.DARK_BLUE,
                cursor: 'default',
            } }, "Click anywhere, or drag an audio file in")));
};
exports.WelcomeView = WelcomeView;
//# sourceMappingURL=WelcomeView.js.map