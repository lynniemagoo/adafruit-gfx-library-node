'use strict';
//===============================================================
// No Adafruit equivalent
//===============================================================
const OHOP = Object.prototype.hasOwnProperty;
const toInt = Math.trunc;
const ALPHA_MAX = 0xFF;

const MODULE_NAME = "Mixin_RGB565_Bresenham_Render";
const _debug = false;

const {
    plotLine, plotLineAA, plotLineWidth,
    plotCircle, plotCircleAA, /*cheating: no plotCircleWidth() exists*/ plotRotatedEllipseRect,
    plotEllipseRect, plotEllipseRectAA, plotEllipseRectWidth,
    plotRotatedEllipse, plotRotatedEllipseAA, plotRotatedEllipseWidth,
    plotQuadBezier, plotQuadBezierAA, /* cheating: no plotQuadBezierWidth() exists use plotQuadRationalBezierWidth */
    plotQuadRationalBezier, plotQuadRationalBezierAA, plotQuadRationalBezierWidth,
    plotCubicBezier, plotCubicBezierAA, plotCubicBezierWidth

    /* Used only internally or not exposed
    plotEllipse, // Helper not used by html page
    plotQuadRationalBezierSeg, plotQuadRationalBezierWidthSeg,
    plotQuadBezierSeg, plotQuadBezierSegAA,
    plotCubicBezierSeg, plotCubicBezierSegAA, plotCubicBezierSegWidth,
    plotQuadRationalBezierSegAA,
    plotRotatedEllipseRectAA, plotRotatedEllipseRectWidth, // not used by html page.
    */
} = require("./bresenham_internal.js");


function rgb565ToHexString(color) {
    return "0x" + color.toString(16).padStart(4,"0").toUpperCase();
}

class DeviceContext {
    constructor(target, color) {
        this._target = target;
        this._color = color;
        this._alpha = OHOP.call(target, "_alpha") ? target._alpha : ALPHA_MAX;
    }
    
    assert(m) {
        console.log(m);
    }
    
    setPixel(x,y) {
        //console.log("DeviceContext.setPixel(x:%o, y:%o)", x, y);
        this._target.writePixel(x, y, this._color);
    }
    
    setPixelAA(x, y, aa) {
        //console.log("DeviceContext.setPixelAA(x:%o, y:%o aa:%o)", x, y, aa);
        const newAlpha = ((ALPHA_MAX - aa) * this._alpha) / ALPHA_MAX;
        this._target.writePixel(x, y, this._color, newAlpha & ALPHA_MAX);
    }
}

const Mixin_RGB565_Bresenham_Render = Base => class extends Base {


    constructor(options) {
        super(options);
        const self = this;
        self._antialias = false;
        self._pen_width = 1.0;
    }


    /**************************************************************************/
    /*!
        @brief  Set the antialias value for the Canvas
        @param  aFlag   Boolean value true or false.
        @returns  this
    */
    /**************************************************************************/
    setAntialias(aFlag) {
        const self = this;
        self._antialias = !! aFlag;
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  get the antialias for the Canvas
        @returns  Boolean value
    */
    /**************************************************************************/
    getAntialias() {
        return this._antialias;
    }

    /**************************************************************************/
    /*!
        @brief  Set the pen width for the Canvas
        @param  penwidth  - Default width used for drawing operations.
        @returns  this
    */
    /**************************************************************************/
    setPenWidth(penwidth) {
        const self = this;
        if (penwidth <= 0.0) throw new Error("penwidth must be > 0");
        self._pen_width = penwidth;
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  get the pen width for the Canvas
        @returns  Default width used for drawing operations.
    */
    /**************************************************************************/
    getPenWidth() {
        return this._pen_width;
    }

    
    /**************************************************************************/
    /*!
        @brief    Draw a circle outline.
                  Clipping is responsibility of writePixel() implementation.
        @param    xm   Center-point x coordinate
        @param    ym   Center-point y coordinate
        @param    r   Radius of circle
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.pen_width, antialias = this.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawCircle(xm, ym, r, color, {width = this._pen_width, antialias = this._antialias} = {}) {
        return this.plotCircle(xm, ym, r, color, {width, antialias});
    }

    /**************************************************************************/
    /*!
        @brief    Draw an ellipse outline.
                  Clipping is responsibility of writePixel() implementation.
        @param    xm   Center-point x coordinate
        @param    ym   Center-point y coordinate
        @param    rx   Radius x in pixels
        @param    ry   Radius y in pixels
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.pen_width, antialias = this.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawEllipse(xm, ym, rx, ry, color, {width = this._pen_width, antialias = this._antialias} = {}) {
        const x0 = xm - rx,
              y0 = ym - ry,
              x1 = xm + rx,
              y1 = ym + ry;
        return this.plotEllipseRect(x0, y0, x1, y1, color, {width, antialias});
    }
    
    /**************************************************************************/
    /*!
        @brief    Draw a rotated ellipse outline.
                  Clipping is responsibility of writePixel() implementation.
        @param    xm   Center-point x coordinate
        @param    ym   Center-point y coordinate
        @param    rx   Radius x in pixels
        @param    ry   Radius y in pixels
        @param    rad  Angle(radians) to rotate
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.pen_width, antialias = this.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawRotatedEllipse(xm, ym, rx, ry, rad, color, {width = this._pen_width, antialias = this._antialias} = {}) {
        return this.plotRotatedEllipse(xm, ym, rx, ry, rad, color, {width, antialias});
    }
    
    /**************************************************************************/
    /*!
        @brief    Draw an ellipse within a rectangle of specified width.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Left x coordinate
        @param    y0  Top  y coordinate
        @param    x1  Right x coordinate
        @param    y1  Bottom y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.pen_width, antialias = this.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawEllipseRect(x0, y0, x1, y1, color, {width = this._pen_width, antialias = this._antialias} = {}) {
        return this.plotEllipseRect(x0, y0, x1, y1, color, {width, antialias});
    }
    
    
    /**************************************************************************/
    /*!
        @brief    Draw a line with or without antialiasing
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Start point x coordinate
        @param    y0  Start point y coordinate
        @param    x1  End point x coordinate
        @param    y1  End point y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.pen_width, antialias = this.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawLine(x0, y0, x1, y1, color, {width = this._pen_width, antialias = this._antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::drawLine(x0:%o, y0:%o, x1:%o, y1:%o, color565:%s, aa:%o)", MODULE_NAME, x0, y0, x1, y1, rgb565ToHexString(color) , aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (w == 1) {
            if (aa) {
                if((x0 == x1) || (y0 == y1)) {
                    // horizontal or vertical line.
                    _debug && console.log("==>plotLine(x0:%o, y0:%o, x1:%o, y1:%o)", x0, x1, y0, y1);
                    plotLine(dc, x0, y0, x1, y1);
                } else if (Math.abs(x1-x0) == Math.abs(y1-y0)) {
                    // Line slope is either +1 or -1.
                    _debug && console.log("==>plotLine(x0:%o, y0:%o, x1:%o, y1:%o)", x0, x1, y0, y1);
                    plotLine(dc, x0, y0, x1, y1);
                } else {
                    _debug && console.log("==>plotLineAA(x0:%o, y0:%o, x1:%o, y1:%o)", x0, x1, y0, y1);
                    plotLineAA(dc, x0, y0, x1, y1);
                }
            } else {
                _debug && console.log("==>plotLine(x0:%o, y0:%o, x1:%o, y1:%o)", x0, x1, y0, y1);
               plotLine(dc, x0, y0, x1, y1);
            }
        } else {
            _debug && console.log("==>plotLineWidth(x0:%o, y0:%o, x1:%o, y1:%o, w:%o)", x0, x1, y0, y1, w);
            plotLineWidth(dc, x0, y0, x1, y1, w);
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Draw a line with or without antialiasing
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Start point x coordinate
        @param    y0  Start point y coordinate
        @param    x1  End point x coordinate
        @param    y1  End point y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @param    antialias boolean value default(false)
        @returns  this
    */
    /**************************************************************************/
    drawLineOrig(x0, y0, x1, y1, color, antialias = this._antialias) {
        const self = this;
        const aa = antialias;
        _debug && console.log("%s::drawLine(x0:%o, y0:%o, x1:%o, y1:%o, color565:%s, aa:%o)", MODULE_NAME, x0, y0, x1, y1, rgb565ToHexString(color) , aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if ((x0 == x1) || (y0 == y1) || !aa) {
            // Draw line without antialiasing in superclass.
            //super.drawLine(x0, y0, x1, y1, color);
            plotLine(dc, x0, y0, x1, y1);
        } else if (Math.abs(x1-x0) == Math.abs(y1-y0)) {
            // We get here antialias is true.
            // Check if we have a slope that is either +1 or -1.
            // If so, Draw line without antialiasing in superclass.
            //super.drawLine(x0, y0, x1, y1, color);
            plotLine(dc, x0, y0, x1, y1);
        } else {
            plotLineAA(dc, x0, y0, x1, y1);
        }
        self.endWrite();
        return self;
    }
    
    
    /**************************************************************************/
    /*!
        @brief    Plot a circle outline with options
                  Clipping is responsibility of writePixel() implementation.
        @param    xm   Center-point x coordinate
        @param    ym   Center-point y coordinate
        @param    r   Radius of circle
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.pen_width, antialias = this.antialias}
        @returns  this
    */
    /**************************************************************************/
    plotCircle(xm, ym, r, color, {width = this._pen_width, antialias = this._antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::plotCircle(xm:%o, ym:%o, r:%o, color565:%s, w:%o, aa:%o)", MODULE_NAME, xm, ym, r, rgb565ToHexString(color), w, antialias);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (!aa && (w == 1)) {
            _debug && console.log("==>plotCircle(xm:%o, ym:%o, r:%o)", xm, ym, r);
            plotCircle(dc, xm, ym, r);
        } else {
            const x0 = xm - r,
                  y0 = ym - r,
                  x1 = xm + r,
                  y1 = ym + r;
            _debug && console.log("==>plotEllipseRectWidth(x0:%o, y0:%o, x1:%o, y1:%o, w:%o)", x0, y0, x1, y1, w);
            // if w < 1.5 plotEllipseRectWidth will use plotEllipsRectAA.
            plotEllipseRectWidth(dc, x0, y0, x1, y1, w);
        }
        self.endWrite();
        return self;
    }

    
    /**************************************************************************/
    /*!
        @brief    Plot an ellipse outline with options
                  Clipping is responsibility of writePixel() implementation.
        @param    xm   Center-point x coordinate
        @param    ym   Center-point y coordinate
        @param    rx   Radius x in pixels
        @param    ry   Radius y in pixels
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.pen_width, antialias = this.antialias}
        @returns  this
    */
    /**************************************************************************/
    /*
    plotEllipse(xm, ym, rx, ry, color, {width = this._pen_width, antialias = this._antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::plotEllipse(xm:%o, ym:%o, rx:%o, ry:%o, color565:%s, w:%o aa:%o)", MODULE_NAME, xm, ym, rx, ry, rgb565ToHexString(color), w, aa);
        const dc = new DeviceContext(self, color);
        const x0 = xm - rx,
              y0 = ym - ry,
              x1 = xm + rx,
              y1 = ym + ry;
        self.startWrite();
        if (!aa && (w == 1)) {
            _debug && console.log("==>plotEllipseRect(x0:%o, y0:%o, x1:%o, y1:%o, w:%o)", x0, y0, x1, y1, w);
            plotEllipseRect(dc, x0, y0, x1, y1);
        } else {
            _debug && console.log("==>plotEllipseRectWidth(x0:%o, y0:%o, x1:%o, y1:%o, w:%o)", x0, y0, x1, y1, w);
            // if w < 1.5 plotEllipseRectWidth will use plotEllipsRectAA.
            plotEllipseRectWidth(dc, x0, y0, x1, y1, w);
        }
        self.endWrite();
        return self;
    }
    */
    
    
    /**************************************************************************/
    /*!
        @brief    Plot an ellipse within a rectangle of specified width.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Left x coordinate
        @param    y0  Top  y coordinate
        @param    x1  Right x coordinate
        @param    y1  Bottom y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.pen_width, antialias = this.antialias}
        @returns  this
    */
    /**************************************************************************/
    plotEllipseRect(x0, y0, x1, y1, color, {width = this._pen_width, antialias = this._antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::drawEllipseRectWidth(x0:%o, y0:%o, x1:%o, y1:%o, color565:%s, w:%o, aa:%o)", MODULE_NAME, x0, y0, x1, y1, rgb565ToHexString(color), w, aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (!aa && (w == 1)) {
            _debug && console.log("==>plotEllipseRect(x0:%o, y0:%o, x1:%o, y1:%o)", x0, y0, x1, y1);
            plotEllipseRect(dc, x0, y0, x1, y1);
        } else {
            _debug && console.log("==>plotEllipseRectWidth(x0:%o, y0:%o, x1:%o, y1:%o, w:%o)", x0, y0, x1, y1, w);
            // if width < 1.5 plotEllipseRectWidth will use plotEllipsRectAA.
            plotEllipseRectWidth(dc, x0, y0, x1, y1, w);
        }
        self.endWrite();
        return self;
    }
    
    
    /**************************************************************************/
    /*!
        @brief    Plot a rotated ellipse.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Left x coordinate
        @param    y0  Top  y coordinate
        @param    x1  Right x coordinate
        @param    y1  Bottom y coordinate
        @param    rad Angle(radians) for rotation
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {radians = 0, width = this.pen_width, antialias = this.antialias}
        @returns  this
    */
    /**************************************************************************/
    plotRotatedEllipse(xm, ym, rx, ry, rad, color, {width = this._pen_width, antialias = this._antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::drawEllipseRectWidth(xm:%o, ym:%o, rx:%o, ry:%o, rad:%o color565:%s, w:%o, aa:%o)", MODULE_NAME, x0, y0, rx, ry, rad, rgb565ToHexString(color), w, aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (!aa && (w == 1)) {
            _debug && console.log("==>plotRotatedEllipse(xm:%o, ym:%o, rx:%o, ry:%o, rad:%o)", xm, ym, rx, ry, rad);
            plotRotatedEllipse(dc, xm, ym, rx, ry, rad);
        } else {
            if (w == 1) {
                _debug && console.log("==>plotRotatedEllipseAA(xm:%o, ym:%o, rx:%o, ry:%o, rad:%o)", xm, ym, rx, ry, rad);
                plotRotatedEllipseAA(dc, xm, ym, rx, ry, rad);
            } else {
                _debug && console.log("==>plotRotatedEllipseWidth(xm:%o, ym:%o, rx:%o, ry:%o, rad:%o w:%o)", xm, ym, rx, ry, rad, w);
                plotRotatedEllipseWidth(dc, xm, ym, rx, ry, rad, w);
            }
        }
        self.endWrite();
        return self;
    }
};

module.exports = Mixin_RGB565_Bresenham_Render;
