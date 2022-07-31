'use strict';
//===============================================================
// No Adafruit equivalent
//===============================================================
const os = require('os');
const LE = ("LE" === os.endianness());

const Util = require("util");
const CANVAS_BASE = "../canvas/";
const GFXcanvas16 = require(CANVAS_BASE + "GFXcanvas16.js");
const toInt = Math.trunc;

const Mixin_RBG565_Display_Render = Base => class extends Base {

    constructor(options) {
        super(options);
    }


    fastRenderGFXcanvas16(gfxCanvas16) {
        if (!(gfxCanvas16 instanceof GFXcanvas16)) {
            throw new Error("Parameter 'gvxCanvas16' is not an instance of GFXcanvas16.");
        }
        const self = this, _width = self._width, _height = self._height;
        const expectedSize = _width * _height;
        let dataSource = gfxCanvas16.getBuffer();
        const dataSize = dataSource.length;
        if (dataSize != expectedSize) throw new Error(Util.format("GFXcanvas16 Data Length is not correct size.  Expected:%d for width:%d height:%d", expectedSize, _width, _height));
        // GFXcanvas16 buffer contains pixel colors that are represented as Uint16Array.
        // If platform endianness is LE, we must first clone the buffer and swap byte order in each element.
        if (LE) {
            if (false) {
                // must clone buffer and convert all the pixels as alpha operations required us to keep in platform format.
                dataSource = dataSource.map(color => ((color & 0xFF) << 8) | ((color >>> 8) & 0xFF));
            } else {
                let idx, color, l = dataSource.length;
                const clone = new Uint16Array(l);
                for (idx = 0; idx < l; idx++) {
                    color = dataSource[idx];
                    color = ((color & 0xFF) << 8) | ((color >>> 8) & 0xFF);
                    clone[idx] = color;
                }
                dataSource = clone;
            }
        }
        const ramData = new Uint8Array(dataSource.buffer, dataSource.byteOffset, dataSource.byteLength);
        self.setAddrWindow(0, 0, self._width, self._height);
        self.sendData(ramData);
        return self;
    }
};

module.exports = Mixin_RBG565_Display_Render;
