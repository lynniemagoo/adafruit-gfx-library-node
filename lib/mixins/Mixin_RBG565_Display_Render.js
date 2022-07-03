'use strict';
const os = require('os');
const LE = ("LE" === os.endianness());

const Util = require("util");
const CANVAS_BASE = "../canvas/";
// FUDGE 
const GFXcanvas16 = require(CANVAS_BASE + "GFXcanvas16.js");
const toInt = Math.trunc;

const Mixin_RBG565_Display_Render = Base => class extends Base {

    // TODO = want to do this differently with parameters.
    async renderGFXcanvas16(gfxCanvas16) {
        if (!(gfxCanvas16 instanceof GFXcanvas16)) {
            throw new Error("Parameter 'gvxCanvas16' is not an instance of GFXcanvas16.");
        }
        const self = this, _width = self._width, _height = self._height;
        const expectedSize = _width * _height;
        const dataSource = await gfxCanvas16.getBuffer();
        const dataSize = dataSource.length;
        if (dataSize != expectedSize) throw new Error(Util.format("GFXcanvas16 Data Length is not correct size.  Expected:%d for width:%d height:%d", expectedSize, _width, _height));
        const ramData = new Uint8Array(dataSource.buffer, dataSource.byteOffset, dataSource.byteLength);
        self.setAddrWindow(0, 0, self._width, self._height);
        self.sendData(ramData);
        return self;
    }    

    // TODO = want to do this differently with parameters.
    renderJimpRGBImage(image) {
        const self = this, _width = self._width, _height = self._height, imageWidth = image.bitmap.width, imageHeight = image.bitmap.height;
        const expectedSize = _width * _height;
        const dataSize = imageWidth * imageHeight;
        if (dataSize != expectedSize) throw new Error(Util.format("Data Length is not correct size.  Expected:%d for width:%d height:%d", expectedSize, _width, _height));
        const scanResult = new Uint16Array(dataSize);
        const bitmapData = image.bitmap.data;
        image.scan(0, 0, imageWidth, imageHeight, function (x, y, idx) {
                const red = bitmapData[idx + 0],
                      green = bitmapData[idx + 1],
                      blue =  bitmapData[idx + 2];
                const MSB = (red & 0xF8 | green >>> 5);
                const LSB = ((green & 0x1C) << 3) | (blue >>> 3);
                let color = LE ? LSB << 8 | MSB : MSB << 8 | LSB;
                scanResult[toInt(idx / 4)] = color;
        });
        const ramData = new Uint8Array(scanResult.buffer, scanResult.byteOffset, scanResult.byteLength);
        self.setAddrWindow(0, 0, _width, _height);
        self.sendData(ramData);
        return self;
    }    

    // TODO = want to do this differently with parameters.
    renderUint16Array(uint16Array) {
        const self = this, _width = self._width, _height = self._height;
        const expectedSize = _width * _height;
        const dataSize = uint16Array.length;
        if (dataSize != expectedSize) throw new Error(Util.format("Data Length is not correct size.  Expected:%d for width:%d height:%d", expectedSize, _width, _height));
        const dataSource = uint16Array;
        const ramData = new Uint8Array(dataSource.buffer, dataSource.byteOffset, dataSource.byteLength);
        self.setAddrWindow(0, 0, _width, _height);
        self.sendData(ramData);
        return self;
    }    
};

module.exports = Mixin_RBG565_Display_Render;
