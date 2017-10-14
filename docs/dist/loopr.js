"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Loopr = /** @class */ (function () {
    function Loopr() {
        var _this = this;
        this.audioContext = new AudioContext();
        this.internalBuffer = null;
        this.audioBufferChangedListeners = [];
        this.setAudioFile = function (file) {
            var fileReader = new FileReader();
            fileReader.onloadend = function () { return _this.audioContext.decodeAudioData(fileReader.result, function (buffer) { return _this.buffer = buffer; }); };
            fileReader.readAsArrayBuffer(file);
        };
        this.onAudioBufferChanged = function (listener) {
            _this.audioBufferChangedListeners.push(listener);
            return function () {
                var index = _this.audioBufferChangedListeners.indexOf(listener);
                _this.audioBufferChangedListeners = _this.audioBufferChangedListeners.filter(function (l, i) { return i !== index; });
            };
        };
    }
    Object.defineProperty(Loopr.prototype, "buffer", {
        get: function () {
            return this.internalBuffer;
        },
        set: function (buffer) {
            this.internalBuffer = buffer;
            this.audioBufferChangedListeners.forEach(function (listener) { return listener(buffer); });
        },
        enumerable: true,
        configurable: true
    });
    return Loopr;
}());
exports.Loopr = Loopr;
//# sourceMappingURL=loopr.js.map