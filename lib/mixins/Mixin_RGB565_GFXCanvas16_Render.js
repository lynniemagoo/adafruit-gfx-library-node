'use strict';
const toInt = Math.trunc;

const ALPHA_MAX = 0xFF;
const AlphaMode = Object.freeze({
    None:0,
    Canvas:1,
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


const Mixin_RGB565_GFXcanvas16_Render = Base => class extends Base {
    static AlphaMode = AlphaMode;

    /**************************************************************************/
    /*!
       @brief    Private function to render a Jimp Image onto the canvas at specific coordinates using image alpha channel if present.
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
            
   
        const canvasAlpha = self._alpha,
            bitmapData = bitmap.data,
            imageHasAlpha = image.hasAlpha(),
            useImageAlpha = ((alphaMode & AlphaMode.Image) != 0),
            useCanvasAlpha = ((alphaMode & AlphaMode.Canvas) != 0),
            alphaBase = useCanvasAlpha ? canvasAlpha : ALPHA_MAX;

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
                    alphaOverride = !useCanvasAlpha ? pixelAlpha : toInt((canvasAlpha * pixelAlpha) / ALPHA_MAX) & ALPHA_MAX;
                }
                self.drawPixel(x + imageX, y + imageY, color565, alphaOverride);
        });
        return self;
    }

    
    /**************************************************************************/
    /*!
       @brief    Render a Jimp RGBA Image onto the canvas at specific coordinates using image alpha channel if present.
       @param    image       Image to render
       @param    x           Image horizontal start point
       @param    y           Image vertical start point
       @param    alphaMode   AlphaMode to use (default is Both) To render using only image alpha channel, specify AlphaMode.Image
    */
    /**************************************************************************/
    renderJimpRGBAImage(image, x, y, alphaMode = AlphaMode.Both) {
        return (!_checkValidJimpImage(image)) ? this : this._renderJimpRGBAImage(image, x, y, alphaMode);
    }
    
    
    /**************************************************************************/
    /*!
       @brief    Render a Jimp RGB Image onto the canvas at specific coordinates ignoring image alpha channel if present.
                 Rendering is done using only the alpha value from canvas (or none).
       @param    image       Image to render
       @param    x           Image horizontal start point
       @param    y           Image vertical start point
       @param    alphaMode   AlphaMode to use (default is Non). To render using Canvas alpha, Specify AlphaMode.Canvas
    */
    /**************************************************************************/
    renderJimpRGBImage(image, x, y, alphaMode = AlphaMode.None) {
        // Disable AlphaMode.Image if specified.
        alphaMode &= ~AlphaMode.Image;
        return (!_checkValidJIMPImage(image)) ? this : this._renderJimpRGBAImage(image, x, y, alphaMode);
    }
};

module.exports = Mixin_RGB565_GFXcanvas16_Render;
