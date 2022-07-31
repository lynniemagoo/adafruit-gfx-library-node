'use strict';
//===============================================================
// No Adafruit equivalent
//===============================================================
const OHOP = Object.prototype.hasOwnProperty;
const toInt = Math.trunc;

const ALPHA_MAX = 0xFF;
const AlphaMode = Object.freeze({
    None:0,
    Device:1,
    Image:2,
    Both:3
});


function _checkValidJimpImage(image) {
    if (!image) throw new Error("Illegal Argument.  Parameter 'image' must not be null or undefined.");

    const bitmap = image.bitmap;
    if (!image.bitmap) throw new Error("Image has no internal bitmap.");

    const bitmapData = bitmap.data;
    if (!bitmapData) throw new Error("Image has no bitmap data.");

    const imageWidth = bitmap.width,
        imageHeight = bitmap.height;

    // if there is no width/height return false as nothing to do.
    return (imageWidth > 0 && imageHeight > 0);
}


const Mixin_RGB565_Jimp_Render = Base => class extends Base {

    constructor(options) {
        super(options);
    }


    /**************************************************************************/
    /*!
       @brief    Private function to render a Jimp Image onto the device at specific coordinates using image alpha channel if present.
       @param    image       Image to render
       @param    x           Image horizontal start point
       @param    y           Image vertical start point
       @param    alphaMode   AlphaMode to use (default is Both) To render using only image alpha channel, specify AlphaMode.Image
    */
    /**************************************************************************/
    _renderJimpRGBAImage(image, x, y, alphaMode) {
        const self = this,
            _width = self._width,
            _height = self._height,
            bitmap = image.bitmap,
            imageWidth = bitmap.width,
            imageHeight = bitmap.height;


        const deviceAlpha = OHOP.call(self, "_alpha") ? self._alpha : ALPHA_MAX,
            bitmapData = bitmap.data,
            imageHasAlpha = image.hasAlpha(),
            useImageAlpha = ((alphaMode & AlphaMode.Image) != 0),
            useDeviceAlpha = ((alphaMode & AlphaMode.Device) != 0),
            alphaBase = useDeviceAlpha ? deviceAlpha : ALPHA_MAX;

        image.scan(0, 0, imageWidth, imageHeight, function (imageX, imageY, dataIdx) {
                const pixelRed = bitmapData[dataIdx + 0],
                      pixelGreen = bitmapData[dataIdx + 1],
                      pixelBlue =  bitmapData[dataIdx + 2],
                      pixelAlpha = bitmapData[dataIdx + 3];
                const MSB = (pixelRed & 0xF8 | pixelGreen >>> 5);
                const LSB = ((pixelGreen & 0x1C) << 3) | (pixelBlue >>> 3);
                let color565 = MSB << 8 | LSB;

                let alphaOverride = alphaBase;
                if (imageHasAlpha && useImageAlpha) {
                    alphaOverride = !useDeviceAlpha ? pixelAlpha : toInt((deviceAlpha * pixelAlpha) / ALPHA_MAX) & ALPHA_MAX;
                }
                self.drawPixel(x + imageX, y + imageY, color565, alphaOverride);
        });
        return self;
    }


    /**************************************************************************/
    /*!
       @brief    Render a Jimp RGBA Image onto a device at specific coordinates using image alpha channel if present.
       @param    image       Image to render
       @param    x           Image horizontal start point
       @param    y           Image vertical start point
       @param    alphaMode   AlphaMode to use (default is Both) To render using only Image alpha channel, specify AlphaMode.Image
    */
    /**************************************************************************/
    renderJimpRGBAImage(image, x, y, alphaMode = AlphaMode.Both) {
        return (!_checkValidJimpImage(image)) ? this : this._renderJimpRGBAImage(image, x, y, alphaMode);
    }


    /**************************************************************************/
    /*!
       @brief    Render a Jimp RGB Image onto a device at specific coordinates ignoring image alpha channel if present.
                 Rendering is done using only the alpha value from device (or none).
       @param    image       Image to render
       @param    x           Image horizontal start point
       @param    y           Image vertical start point
       @param    alphaMode   AlphaMode to use (default is None). To render using Device alpha, Specify AlphaMode.Device
    */
    /**************************************************************************/
    renderJimpRGBImage(image, x, y, alphaMode = AlphaMode.None) {
        // Disable AlphaMode.Image if specified.
        alphaMode &= ~AlphaMode.Image;
        return (!_checkValidJimpImage(image)) ? this : this._renderJimpRGBAImage(image, x, y, alphaMode);
    }

    static AlphaMode = AlphaMode;
};

module.exports = Mixin_RGB565_Jimp_Render;
