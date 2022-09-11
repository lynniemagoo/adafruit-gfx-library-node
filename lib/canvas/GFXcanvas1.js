/*
This is the core graphics library for all our displays, providing a common
set of graphics primitives (points, lines, circles, etc.).  It needs to be
paired with a hardware-specific library for each display device we carry
(to handle the lower-level functions).

Adafruit invests time and resources providing this open source code, please
support Adafruit & open-source hardware by purchasing products from Adafruit!

Copyright (c) 2013 Adafruit Industries.  All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

- Redistributions of source code must retain the above copyright notice,
  this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
 */

// Notes from original Adafruit CPP implementation.
// -------------------------------------------------------------------------
// GFXcanvas1, GFXcanvas8 and GFXcanvas16 (currently a WIP, don't get too
// comfy with the implementation) provide 1-, 8- and 16-bit offscreen
// canvases, the address of which can be passed to drawBitmap() or
// pushColors() (the latter appears only in a couple of GFX-subclassed TFT
// libraries at this time).  This is here mostly to help with the recently-
// added proportionally-spaced fonts; adds a way to refresh a section of the
// screen without a massive flickering clear-and-redraw...but maybe you'll
// find other uses too.  VERY RAM-intensive, since the buffer is in MCU
// memory and not the display driver...GXFcanvas1 might be minimally useful
// on an Uno-class board, but this and the others are much more likely to
// require at least a Mega or various recent ARM-type boards (recommended,
// as the text+bitmap draw can be pokey).  GFXcanvas1 requires 1 bit per
// pixel (rounded up to nearest byte per scanline), GFXcanvas8 is 1 byte
// per pixel (no scanline pad), and GFXcanvas16 uses 2 bytes per pixel (no
// scanline pad).
// NOT EXTENSIVELY TESTED YET.  MAY CONTAIN WORST BUGS KNOWN TO HUMANKIND.
// -------------------------------------------------------------------------

'use strict';
const CORE_LOCATION = "../core/";
const Adafruit_GFX = require(CORE_LOCATION + "Adafruit_GFX.js");

const toInt = Math.trunc,
      fFloor = Math.floor,
      fRound = Math.round;

// Bitmask tables of 0x80>>>X and ~(0x80>>>X), because X>>>Y is slow on AVR
const CANVAS1_PR_SET_BIT_MASK = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01];
const CANVAS1_PR_CLEAR_BIT_MASK = [0x7F, 0xBF, 0xDF, 0xEF, 0xF7, 0xFB, 0xFD, 0xFE];

/*
    Canvas where rows are packed into a single byte.  Byte 0 of the buffer represents pixels (0,0) .. (7,0).
 */
class GFXcanvas1_PackedRow extends Adafruit_GFX {

    constructor(options) {
        super(options);
        const self = this;

        // allocate our buffer and clear it.
        const buffer = new Uint8Array(toInt((self.WIDTH + 7) / 8) * self.HEIGHT);
        buffer.fill(0x00);
        self._buffer = buffer;
    }


    /**********************************************************************/
    /*!
        @brief    Get a reference to the internal buffer memory
        @returns  A reference to the allocated Uint8Array buffer
    */
    /**********************************************************************/
    getBuffer(){
        return this._buffer;
    }


    /**********************************************************************/
    /*!
        @brief    Get the pixel color value at a given coordinate
        @param    x   x coordinate
        @param    y   y coordinate
        @returns  The desired pixel's binary color value, either 0x1 (on) or 0x0 (off)
    */
    /**********************************************************************/
    getPixel(x, y) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT;

        // Ensure values are integers.
        x = toInt(x);
        y = toInt(y);

        let t;
        switch (rotation) {
            case 0:
            default:
                break;
            case 1:
                t = x;
                x = WIDTH - 1 - y;
                y = t;
                break;
            case 2:
                x = WIDTH - 1 - x;
                y = HEIGHT - 1 - y;
                break;
            case 3:
                t = x;
                x = y;
                y = HEIGHT - 1 - t;
                break;
        }
        return self._getRawPixel(x, y);
    }


    /**********************************************************************/
    /*!
        @brief    Get the pixel color value at a given, unrotated coordinate.
                  This method is intended for hardware drivers to get pixel value
                  in physical coordinates.
        @param    x   x coordinate
        @param    y   y coordinate
        @returns  The desired pixel's binary color value, either 0x01 (on) or 0x00 (off)
    */
    /**********************************************************************/
    _getRawPixel(x, y) {
        const self = this,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            buffer = self._buffer;
        if ((x < 0) || (y < 0) || (x >= WIDTH) || (y >= HEIGHT))
            return 0x00;
        if (buffer) {
            // this calculation is different than the one for SSD1306 - is this because of the fact that 1 bit canvas packs the pixels into row-major vs column major format?
            // x + toInt(y / 8) * WIDTH]
            let idx = toInt(x / 8) + y * toInt((WIDTH + 7) / 8);
            //const bit_mask = (0x80 >>> (x & 7));
            return (buffer[idx] & (0x80 >>> (x & 7))) != 0 ? 0x01 : 0x00;
            //return (buffer[idx] & CANVAS1_PR_SET_BIT_MASK[x & 7]) != 0 ? 0x01 : 0x00;
        }
        return 0x00;
    }


    /**************************************************************************/
    /*!
        @brief  Draw a pixel to the canvas framebuffer
        @param  x     x coordinate
        @param  y     y coordinate
        @param  color Binary (on or off) color to fill with
        @returns  this
    */
    /**************************************************************************/
    drawPixel(x, y, color) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            _width = self._width,
            _height = self._height,
            buffer = self._buffer;

        // Ensure values are integers.
        x = toInt(x);
        y = toInt(y);

        if (buffer) {
            if ((x < 0) || (y < 0) || (x >= _width) || (y >= _height)) {
                return self;
            }

            let t;
            switch (self.rotation) {
                case 0:
                default:
                    break;
                case 1:
                    t = x;
                    x = WIDTH - 1 - y;
                    y = t;
                    break;
                case 2:
                    x = WIDTH - 1 - x;
                    y = HEIGHT - 1 - y;
                    break;
                case 3:
                    t = x;
                    x = y;
                    y = HEIGHT - 1 - t;
                    break;
            }
            const idx = toInt(x / 8) + (y * toInt((WIDTH + 7) / 8));
            //const bit_mask = color ? 0x80 >>> (x & 7) : ~(0x80 >>> (x & 7));
            const bit_mask = color ? CANVAS1_PR_SET_BIT_MASK[x & 7] : CANVAS1_PR_CLEAR_BIT_MASK[x & 7];
            if (color) {
                buffer[idx] |= bit_mask;
            } else {
                buffer[idx] &= bit_mask;
            }
            //buffer[idx] = color ? buffer[idx] | bit_mask : buffer[idx] & ~bit_mask;
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Fill the framebuffer completely with one color
        @param  color Binary (on or off) color to fill with
        @returns  this
    */
    /**************************************************************************/
    fillScreen(color) {
        const self = this,
            buffer = self._buffer;
        if (buffer) {
            buffer.fill(color ? 0xFF : 0x00);
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Speed optimized vertical line drawing
        @param  x      Line horizontal start point
        @param  y      Line vertical start point
        @param  h      Length of vertical line to be drawn, including first point
        @param  color  Color to fill with
        @returns  this
    */
    /**************************************************************************/
    drawFastVLine(x, y, h, color) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            _width = self._width,
            _height = self._height;

        // Ensure values are integers.
        x = toInt(x);
        y = toInt(y);
        h = toInt(h);

        if (h < 0) { // Convert negative heights to positive equivalent
            h *= -1;
            y -= (h - 1);
            if (y < 0) {
                h += y;
                y = 0;
            }
        }

        // Edge rejection (no-draw if totally off canvas)
        if ((x < 0) || (x >= _width) || (y >= _height) || ((y + h - 1) < 0)) {
            return self;
        }

        if (y < 0) { // Clip top
            h += y;
            y = 0;
        }
        if (y + h > _height) { // Clip bottom
            h = _height - y;
        }

        let t, bSwap = false;
        switch(rotation) {
            case 0:
            default:
                break;
            case 1:
                bSwap = true;
                t = x;
                x = WIDTH - 1 - y;
                y = t;
                x -= (h - 1);
                break;
            case 2:
                x = WIDTH - 1 - x;
                y = HEIGHT - 1 - y;
                y -= (h - 1);
                break;
            case 3:
                bSwap = true;
                t = x;
                x = y;
                y = HEIGHT - 1 - t;
                break;
        }
        return (bSwap) ? self._drawFastRawHLine(x, y, h, color) : self._drawFastRawVLine(x, y, h, color);
    }


    /**************************************************************************/
    /*!
        @brief  Speed optimized horizontal line drawing
        @param  x      Line horizontal start point
        @param  y      Line vertical start point
        @param  w      Length of horizontal line to be drawn, including first point
        @param  color  Color to fill with
        @returns  this
    */
    /**************************************************************************/
    drawFastHLine(x, y, w, color) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            _width = self._width,
            _height = self._height;

        // Ensure values are integers.
        x = toInt(x);
        y = toInt(y);
        w = toInt(w);

        if (w < 0) { // Convert negative widths to positive equivalent
            w *= -1;
            x -= (w - 1);
            if (x < 0) {
                w += x;
                x = 0;
            }
        }

        // Edge rejection (no-draw if totally off canvas)
        if ((y < 0) || (y >= _height) || (x >= _width) || ((x + w - 1) < 0)) {
            return self;
        }

        if (x < 0) { // Clip left
            w += x;
            x = 0;
        }

        if (x + w >= _width) { // Clip right
            w = _width - x;
        }

        let t, bSwap = false;
        switch(rotation) {
            case 0:
            default:
                break;
            case 1:
                bSwap = true;
                t = x;
                x = WIDTH - 1 - y;
                y = t;
                break;
            case 2:
                x = WIDTH - 1 - x;
                y = HEIGHT - 1 - y;
                x -= (w - 1);
                break;
            case 3:
                bSwap = true;
                t = x;
                x = y;
                y = HEIGHT - 1 - t;
                y -= (w - 1);
                break;
        }
        return (bSwap) ? self._drawFastRawVLine(x, y, w, color) : self._drawFastRawHLine(x, y, w, color);
    }


    /**************************************************************************/
    /*!
        @brief    Speed optimized vertical line drawing into the raw canvas buffer
        @param    x   Line horizontal start point
        @param    y   Line vertical start point
        @param    h   length of vertical line to be drawn, including first point
        @param    color   Binary (on or off) color to fill with
        @returns  this
    */
    /**************************************************************************/
    _drawFastRawVLine(x, y, h, color) {
        const self = this,
            WIDTH = self.WIDTH,
            buffer = self._buffer;
        // x & y already in raw (rotation 0) coordinates, no need to transform.
        const row_bytes = toInt((WIDTH + 7) / 8);
        let idx = toInt(x / 8) + y * row_bytes;
        if (color > 0) {
            //const bit_mask = (0x80 >>> (x & 7));
            const bit_mask = CANVAS1_PR_SET_BIT_MASK[x & 7];
            for (let i = 0; i < h; i++) {
                //buffer[idx] |= bit_mask;
                buffer[idx] = buffer[idx] | bit_mask;
                idx += row_bytes;
            }
        } else {
            //const bit_mask = ~(0x80 >>> (x & 7));
            const bit_mask = CANVAS1_PR_CLEAR_BIT_MASK[x & 7];
            for (let i = 0; i < h; i++) {
                //buffer[idx] &= bit_mask;
                buffer[idx] = buffer[idx] & bit_mask;
                idx += row_bytes;
            }
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Speed optimized horizontal line drawing into the raw canvas buffer
        @param    x   Line horizontal start point
        @param    y   Line vertical start point
        @param    w   length of horizontal line to be drawn, including first point
        @param    color   Binary (on or off) color to fill with
        @returns  this
    */
    /**************************************************************************/
    _drawFastRawHLine(x, y, w, color) {
        const self = this,
            WIDTH = self.WIDTH,
            buffer = self._buffer;
        // x & y already in raw (rotation 0) coordinates, no need to transform.
        const row_bytes = toInt((WIDTH + 7) / 8);
        let idx = toInt(x / 8) + y * row_bytes;
        let remainingWidthBits = w;

        // check to see if first byte needs to be partially filled
        if ((x & 7) > 0) {
            // create bit mask for first byte
            let startByteBitMask = 0x00;
            for (let i = (x & 7); ((i < 8) && (remainingWidthBits > 0)); i++) {
                //startByteBitMask |= (0x80 >>> i);
                startByteBitMask |= CANVAS1_PR_SET_BIT_MASK[i];
                remainingWidthBits--;
            }
            if(color > 0) {
                buffer[idx] |= startByteBitMask;
                //buffer[idx] = buffer[idx] | startByteBitMask;
            } else {
                buffer[idx] &= ~startByteBitMask;
                //buffer[idx] = buffer[idx] & ~startByteBitMask;
            }
            idx++;
        }

        // do the next remainingWidthBits bits
        if (remainingWidthBits > 0) {
            let remainingWholeBytes = toInt(remainingWidthBits / 8);
            let lastByteBits = remainingWidthBits % 8;
            buffer.fill(color > 0 ? 0xFF : 0x00, idx, idx + remainingWholeBytes);

            if (lastByteBits > 0) {
                let lastByteBitMask = 0x00;
                for (let i = 0; i < lastByteBits; i++) {
                    //const lastByteBitMask |= (0x80 >>> i);
                    lastByteBitMask |= CANVAS1_PR_SET_BIT_MASK[i];
                }
                idx += remainingWholeBytes;

                if (color > 0) {
                    buffer[idx] |= lastByteBitMask;
                    //buffer[idx] = buffer[idx] | lastByteBitMask;
                } else {
                    buffer[idx] &= ~lastByteBitMask;
                    //buffer[idx] = buffer[idx] & ~lastByteBitMask;
                }
            }
        }
        return self;
    }

}



// Bitmask tables of 0x01<<n and ~(0x01<<n), because V<<n is slow on AVR
const CANVAS1_PC_SET_BIT_MASK = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];
const CANVAS1_PC_CLEAR_BIT_MASK = [0xFE, 0xFD, 0xFB, 0xF7, 0xEF, 0xDF, 0xBF, 0x7F];
// Used for VLine functions below.
const CANVAS1_PC_VLINE_PRE_MASK = [0x00, 0x80, 0xC0, 0xE0, 0xF0, 0xF8, 0xFC, 0xFE];
const CANVAS1_PC_VLINE_POST_MASK = [0x00, 0x01, 0x03, 0x07, 0x0F, 0x1F, 0x3F, 0x7F];

/*
    Canvas where columns are packed into a single byte.  Byte 0 of the buffer represents pixels (0,0) .. (0,7).
 */
class GFXcanvas1_PackedColumn extends Adafruit_GFX {
    constructor(options) {
        super(options);
        const self = this;

        // allocate our buffer and clear it.
        const buffer = new Uint8Array(self.WIDTH * toInt((self.HEIGHT + 7) / 8));
        buffer.fill(0x00);
        self._buffer = buffer;
    }


    /**********************************************************************/
    /*!
       @brief    Get a reference to the internal buffer memory
       @returns  A reference to the UInt8Array buffer
    */
    /**********************************************************************/
    getBuffer(){
        return this._buffer;
    }


    /**********************************************************************/
    /*!
        @brief    Get the pixel color value at a given coordinate
        @param    x   x coordinate
        @param    y   y coordinate
        @returns  The desired pixel's binary color value, either 0x1 (on) or 0x0 (off)
    */
    /**********************************************************************/
    getPixel(x, y) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT;

        // Ensure values are integers.
        x = toInt(x);
        y = toInt(y);

        let t;
        switch (rotation) {
            case 0:
            default:
                break;
            case 1:
                t = x;
                x = WIDTH - 1 - y;
                y = t;
                break;
            case 2:
                x = WIDTH - 1 - x;
                y = HEIGHT - 1 - y;
                break;
            case 3:
                t = x;
                x = y;
                y = HEIGHT - 1 - t;
                break;
        }
        return self._getRawPixel(x, y);
    }


    /**********************************************************************/
    /*!
        @brief    Get the pixel color value at a given, unrotated coordinate.
                  This method is intended for hardware drivers to get pixel value
                  in physical coordinates.
        @param    x   x coordinate
        @param    y   y coordinate
        @returns  The desired pixel's binary color value, either 0x01 (on) or 0x00 (off)
    */
    /**********************************************************************/
    _getRawPixel(x, y) {
        const self = this,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            buffer = self._buffer;
        if ((x < 0) || (y < 0) || (x >= WIDTH) || (y >= HEIGHT))
            return 0x00;
        if (buffer) {
            let idx = x + toInt(y / 8) * WIDTH;
            //const bit_mask = (0x01 << (y & 7));
            return (buffer[idx] & (0x01 << (y & 7))) != 0 ? 0x01 : 0x00;
            //return (buffer[idx] & CANVAS1_PC_SET_BIT_MASK[y & 7]) != 0 ? 0x01 : 0x00;
        }
        return 0x00;
    }


    /**************************************************************************/
    /*!
        @brief  Draw a pixel to the canvas framebuffer
        @param  x     x coordinate
        @param  y     y coordinate
        @param  color Binary (on or off) color to fill with
        @returns  this
    */
    /**************************************************************************/
    drawPixel(x, y, color) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            _width = self._width,
            _height = self._height,
            buffer = self._buffer;

        // Ensure values are integers.
        x = toInt(x);
        y = toInt(y);

        if (buffer) {
            if ((x < 0) || (y < 0) || (x >= _width) || (y >= _height)) {
                return self;
            }

            let t;
            switch (self.rotation) {
                case 0:
                default:
                    break;
                case 1:
                    t = x;
                    x = WIDTH - 1 - y;
                    y = t;
                    break;
                case 2:
                    x = WIDTH - 1 - x;
                    y = HEIGHT - 1 - y;
                    break;
                case 3:
                    t = x;
                    x = y;
                    y = HEIGHT - 1 - t;
                    break;
            }
            const idx = x + toInt(y / 8) * WIDTH;
            const bit_mask = (1 << (y & 7));//color ? CANVAS1_PC_SET_BIT_MASK[y & 7] : CANVAS1_PC_CLEAR_BIT_MASK[y & 7];
            if (color) {
                buffer[idx] |= bit_mask;
            } else {
                buffer[idx] &= ~bit_mask;
            }
            //buffer[idx] = color ? buffer[idx] | bit_mask : buffer[idx] & ~bit_mask;
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Fill the framebuffer completely with one color
        @param  color Binary (on or off) color to fill with
        @returns  this
    */
    /**************************************************************************/
    fillScreen(color) {
        const self = this,
            buffer = self._buffer;
        if (buffer) {
            buffer.fill(color ? 0xFF : 0x00);
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Speed optimized vertical line drawing
        @param  x      Line horizontal start point
        @param  y      Line vertical start point
        @param  h      Length of vertical line to be drawn, including first point
        @param  color  Color to fill with
        @returns  this
    */
    /**************************************************************************/
    drawFastVLine(x, y, h, color) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            _width = self._width,
            _height = self._height;

        // Ensure values are integers.
        x = toInt(x);
        y = toInt(y);
        h = toInt(h);

        if (h < 0) { // Convert negative heights to positive equivalent
            h *= -1;
            y -= (h - 1);
            if (y < 0) {
                h += y;
                y = 0;
            }
        }

        // Edge rejection (no-draw if totally off canvas)
        if ((x < 0) || (x >= _width) || (y >= _height) || ((y + h - 1) < 0)) {
            return self;
        }

        if (y < 0) { // Clip top
            h += y;
            y = 0;
        }
        if (y + h > _height) { // Clip bottom
            h = _height - y;
        }

        let t, bSwap = false;
        switch(rotation) {
            case 0:
            default:
                break;
            case 1:
                bSwap = true;
                t = x;
                x = WIDTH - 1 - y;
                y = t;
                x -= (h - 1);
                break;
            case 2:
                x = WIDTH - 1 - x;
                y = HEIGHT - 1 - y;
                y -= (h - 1);
                break;
            case 3:
                bSwap = true;
                t = x;
                x = y;
                y = HEIGHT - 1 - t;
                break;
        }
        return (bSwap) ? self._drawFastRawHLine(x, y, h, color) : self._drawFastRawVLine(x, y, h, color);
    }


    /**************************************************************************/
    /*!
        @brief  Speed optimized horizontal line drawing
        @param  x      Line horizontal start point
        @param  y      Line vertical start point
        @param  w      Length of horizontal line to be drawn, including first point
        @param  color  Color to fill with
        @returns  this
    */
    /**************************************************************************/
    drawFastHLine(x, y, w, color) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            _width = self._width,
            _height = self._height;

        // Ensure values are integers.
        x = toInt(x);
        y = toInt(y);
        w = toInt(w);

        if (w < 0) { // Convert negative widths to positive equivalent
            w *= -1;
            x -= (w - 1);
            if (x < 0) {
                w += x;
                x = 0;
            }
        }

        // Edge rejection (no-draw if totally off canvas)
        if ((y < 0) || (y >= _height) || (x >= _width) || ((x + w - 1) < 0)) {
            return self;
        }

        if (x < 0) { // Clip left
            w += x;
            x = 0;
        }

        if (x + w >= _width) { // Clip right
            w = _width - x;
        }

        let t, bSwap = false;
        switch(rotation) {
            case 0:
            default:
                break;
            case 1:
                bSwap = true;
                t = x;
                x = WIDTH - 1 - y;
                y = t;
                break;
            case 2:
                x = WIDTH - 1 - x;
                y = HEIGHT - 1 - y;
                x -= (w - 1);
                break;
            case 3:
                bSwap = true;
                t = x;
                x = y;
                y = HEIGHT - 1 - t;
                y -= (w - 1);
                break;
        }
        return (bSwap) ? self._drawFastRawVLine(x, y, w, color) : self._drawFastRawHLine(x, y, w, color);
    }


    /**************************************************************************/
    /*!
        @brief    Speed optimized vertical line drawing into the raw canvas buffer
        @param    x   Line horizontal start point
        @param    y   Line vertical start point
        @param    h   length of vertical line to be drawn, including first point
        @param    color   Binary (on or off) color to fill with
        @returns  this
    */
    /**************************************************************************/
    _drawFastRawVLine(x, y, h, color) {
        const self = this,
            WIDTH = self.WIDTH,
            buffer = self._buffer;
        let index = x + toInt(y / 8) * WIDTH;
        let mod = y & 7;
        const value = (1 << (y & 7));

        // do the first partial byte, if necessary - this requires some masking
        if (mod) {
            // mask off the high n bits we want to set
            mod = 8 - mod;
            // note - lookup table results in a nearly 10% performance
            // improvement in fill* functions
            // uint8_t bit_mask = ~(0xFF >>> mod);
            let bit_mask = CANVAS1_PC_VLINE_PRE_MASK[mod];
            // adjust the mask if we're not going to reach the end of this byte
            if (h < mod)
                bit_mask &= (0XFF >>> (mod - h));
            if (color) {
                buffer[index] |= bit_mask;
            } else {
                buffer[index] &= ~bit_mask;
            }
            index += WIDTH;
        }

        if (h >= mod) { // More to go?
            h -= mod;
            // Write solid bytes while we can - effectively 8 rows at a time
            if (h >= 8) {
                // store a local value to work with
                let value = color ? 0xFF : 0x00;
                do {
                  buffer[index] = value;   // Set byte
                  index += WIDTH; // Advance index 8 rows
                  h -= 8;      // Subtract 8 rows from height
                } while (h >= 8);
            }

            if (h) { // Do the final partial byte, if necessary
                mod = h & 7;
                // this time we want to mask the low bits of the byte,
                // vs the high bits we did above
                // uint8_t bit_mask = (1 << mod) - 1;
                // note - lookup table results in a nearly 10% performance
                // improvement in fill* functions
                const bit_mask = CANVAS1_PC_VLINE_POST_MASK[mod];
                if (color) {
                    buffer[index] |= bit_mask;
                } else {
                    buffer[index]  &= ~bit_mask;
                }
            }
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Speed optimized horizontal line drawing into the raw canvas buffer
        @param    x   Line horizontal start point
        @param    y   Line vertical start point
        @param    w   length of horizontal line to be drawn, including first point
        @param    color   Binary (on or off) color to fill with
        @returns  this
    */
    /**************************************************************************/
    _drawFastRawHLine(x, y, w, color) {
        const self = this,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            buffer = self._buffer;

        let idx = x + toInt(y / 8) * WIDTH;
        //const bit_mask = (1 << (y & 7));
        const bit_mask = CANVAS1_PC_SET_BIT_MASK[y & 7];
        if (color) {
            while(w--)
                buffer[idx++] |= bit_mask;
        } else {
            while(w--)
                buffer[idx++] &= ~bit_mask;
        }
        return self;
    }
}
const GFXcanvas1 = GFXcanvas1_PackedRow;

module.exports = {GFXcanvas1,
                  GFXcanvas1_PackedRow,
                  GFXcanvas1_PackedColumn
};

