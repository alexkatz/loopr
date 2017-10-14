"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var react_virtualized_1 = require("react-virtualized");
var colors_1 = require("./shared/colors");
var loopr_1 = require("./loopr");
var LooprView_1 = require("./LooprView");
var WelcomeView_1 = require("./shared/WelcomeView");
var Dropzone = require('react-dropzone').default;
var Home = /** @class */ (function (_super) {
    __extends(Home, _super);
    function Home(props) {
        var _this = _super.call(this, props) || this;
        _this.loopr = new loopr_1.Loopr();
        _this.removeListeners = [];
        _this.state = { audioBuffer: null };
        return _this;
    }
    Home.prototype.componentWillMount = function () {
        var _this = this;
        this.removeListeners.push(this.loopr.onAudioBufferChanged(function (audioBuffer) { return _this.setState({ audioBuffer: audioBuffer }); }));
    };
    Home.prototype.componentWillUnmount = function () {
        this.removeListeners.forEach(function (removeListener) { return removeListener(); });
    };
    Home.prototype.render = function () {
        var _this = this;
        var audioBuffer = this.state.audioBuffer;
        return (React.createElement(react_virtualized_1.AutoSizer, null, function (_a) {
            var width = _a.width, height = _a.height;
            return (React.createElement("div", { style: {
                    width: width,
                    height: height,
                    backgroundColor: colors_1.Color.LIGHT_BLUE,
                } },
                React.createElement(Dropzone, { onDrop: function (_a) {
                        var file = _a[0];
                        return _this.loopr.setAudioFile(file);
                    }, accept: 'audio/*', disableClick: audioBuffer != null, style: {
                        width: '100%',
                        height: '100%',
                    } },
                    !audioBuffer && (React.createElement(WelcomeView_1.WelcomeView, { width: width })),
                    audioBuffer && (React.createElement(LooprView_1.LooprView, { width: width, height: height, audioBuffer: audioBuffer })))));
        }));
    };
    return Home;
}(React.Component));
exports.Home = Home;
//# sourceMappingURL=Home.js.map