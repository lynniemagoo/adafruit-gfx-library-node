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

class GFXcanvas16 extends Adafruit_GFX {

    constructor(options) {
        super(options);
        const self = this;
        // allocate our buffer and clear it.
        const buffer = new Uint16Array(self.WIDTH * self.HEIGHT);
        buffer.fill(0x0000);
        self._buffer = buffer;
    }


    /**********************************************************************/
    /*!
     @brief    Get a pointer to the internal buffer memory
     @returns  A pointer to the allocated buffer
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
            @returns  The desired pixel's 16-bit color value
    */
    /**********************************************************************/
    getPixel(x, y) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT;
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
            @returns  The desired pixel's 16-bit color value
    */
    /**********************************************************************/
    _getRawPixel(x,y) {
        const self = this,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            buffer = self._buffer;
        if ((x < 0) || (y < 0) || (x >= WIDTH) || (y >= HEIGHT))
            return 0x00;
        return (buffer) ? buffer[x + y * WIDTH] : 0x00;
    }


    /**************************************************************************/
    /*!
        @brief  Draw a pixel to the canvas framebuffer
        @param  x   x coordinate
        @param  y   y coordinate
        @param  color 16-bit Color to fill with..
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

            if ((x < 0) || (y < 0) || (x >= _width) || (y >= _height)) {
            return self;
        }

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

        color &= 0xFFFF;
        buffer[x + y * WIDTH] = color;
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Fill the framebuffer completely with one color
        @param  color 16-bit Color to fill with.
    */
    /**************************************************************************/
    fillScreen(color) {
        const self = this,
            buffer = self._buffer;
        if (buffer) {
            color &= 0xFFFF;
            buffer.fill(color);
        }
        return self;
    }


    /**************************************************************************/
    /*!
       @brief  Speed optimized vertical line drawing
       @param  x      Line horizontal start point
       @param  y      Line vertical start point
       @param  h      Length of vertical line to be drawn, including first point
       @param  color  16-bit Color to fill with.
    */
    /**************************************************************************/
    drawFastVLine(x, y, h, color) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            _width = self._width,
            _height = self._height;

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
       @param  w      Length of horizontal line to be drawn, including 1st point
       @param  color  16-bit Color to fill with.
    */
    /**************************************************************************/
    drawFastHLine(x, y, w, color) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            _width = self._width,
            _height = self._height;

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
                ;
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
       @param    color   16-bit Color to fill with.
    */
    /**************************************************************************/
    _drawFastRawVLine(x, y, h, color) {
        const self = this,
            WIDTH = self.WIDTH,
            buffer = self._buffer;

        let idx = y * WIDTH + x;

        color &= 0xFFFF;
        for (let i = 0; i < h; i++, idx += WIDTH) {
            buffer[idx] = color;
        }
        return self;
    }


    /**************************************************************************/
    /*!
       @brief    Speed optimized horizontal line drawing into the raw canvas buffer
       @param    x   Line horizontal start point
       @param    y   Line vertical start point
       @param    w   length of horizontal line to be drawn, including first point
       @param    color   16-bit Color to fill with.
    */
    /**************************************************************************/
    _drawFastRawHLine(x, y, w, color) {
        // x & y already in raw (rotation 0) coordinates, no need to transform.
        const self = this,
            WIDTH = self.WIDTH,
            buffer = self._buffer,
            idxStart = y * WIDTH + x,
            idxEnd = idxStart + w;

        buffer.fill(color & 0xFFFF, idxStart, idxEnd);
        return self;
    }
}

module.exports = GFXcanvas16;

