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
var LooprView = /** @class */ (function (_super) {
    __extends(LooprView, _super);
    function LooprView() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.canvas = null;
        _this.hydrateChannelData = function (audioBuffer, callback) {
            var leftChannelData = audioBuffer.getChannelData(0);
            var rightChannelData = audioBuffer.getChannelData(1);
            _this.setState({ leftChannelData: leftChannelData, rightChannelData: rightChannelData }, callback);
        };
        _this.plotWaveform = function () {
            var _a = _this.state, leftChannelData = _a.leftChannelData, rightChannelData = _a.rightChannelData;
            if (!leftChannelData || leftChannelData.length === 0 || !_this.canvas) {
                return;
            }
        };
        return _this;
    }
    LooprView.prototype.componentWillMount = function () {
        var audioBuffer = this.props.audioBuffer;
        if (audioBuffer) {
            this.hydrateChannelData(audioBuffer);
        }
    };
    LooprView.prototype.componentDidMount = function () {
        this.plotWaveform();
    };
    LooprView.prototype.componentWillReceiveProps = function (nextProps) {
        var currBuffer = this.props.audioBuffer;
        var nextBuffer = nextProps.audioBuffer;
        if (nextBuffer !== currBuffer) {
            this.hydrateChannelData(nextBuffer, this.plotWaveform);
        }
    };
    LooprView.prototype.render = function () {
        var _this = this;
        var _a = this.props, width = _a.width, height = _a.height;
        return (React.createElement("div", { style: {
                width: width,
                height: height,
            } },
            React.createElement("canvas", { ref: function (canvas) { return _this.canvas = canvas; }, style: {
                    marginTop: 40,
                    height: 200,
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    width: width,
                } })));
    };
    return LooprView;
}(React.Component));
exports.LooprView = LooprView;
//# sourceMappingURL=LooprView.js.map