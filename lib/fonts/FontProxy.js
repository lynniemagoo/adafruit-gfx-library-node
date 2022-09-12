'use strict';
const Util = require("util");

const _packageName = "@lynniemagoo/adafruit-gfx-library.Fonts";
const _fontsLookup = {
    FreeMono9pt7b:"FreeMono9pt7b",
    FreeMono12pt7b:"FreeMono12pt7b",
    FreeMono18pt7b:"FreeMono18pt7b",
    FreeMono24pt7b:"FreeMono24pt7b",

    FreeMonoBold9pt7b:"FreeMonoBold9pt7b",
    FreeMonoBold12pt7b:"FreeMonoBold12pt7b",
    FreeMonoBold18pt7b:"FreeMonoBold18pt7b",
    FreeMonoBold24pt7b:"FreeMonoBold24pt7b",

    FreeMonoBoldOblique9pt7b:"FreeMonoBoldOblique9pt7b",
    FreeMonoBoldOblique12pt7b:"FreeMonoBoldOblique12pt7b",
    FreeMonoBoldOblique18pt7b:"FreeMonoBoldOblique18pt7b",
    FreeMonoBoldOblique24pt7b:"FreeMonoBoldOblique24pt7b",

    FreeMonoOblique9pt7b:"FreeMonoOblique9pt7b",
    FreeMonoOblique12pt7b:"FreeMonoOblique12pt7b",
    FreeMonoOblique18pt7b:"FreeMonoOblique18pt7b",
    FreeMonoOblique24pt7b:"FreeMonoOblique24pt7b",


    FreeSans9pt7b:"FreeSans9pt7b",
    FreeSans12pt7b:"FreeSans12pt7b",
    FreeSans18pt7b:"FreeSans18pt7b",
    FreeSans24pt7b:"FreeSans24pt7b",

    FreeSansBold9pt7b:"FreeSansBold9pt7b",
    FreeSansBold12pt7b:"FreeSansBold12pt7b",
    FreeSansBold18pt7b:"FreeSansBold18pt7b",
    FreeSansBold24pt7b:"FreeSansBold24pt7b",

    FreeSansBoldOblique9pt7b:"FreeSansBoldOblique9pt7b",
    FreeSansBoldOblique12pt7b:"FreeSansBoldOblique12pt7b",
    FreeSansBoldOblique18pt7b:"FreeSansBoldOblique18pt7b",
    FreeSansBoldOblique24pt7b:"FreeSansBoldOblique24pt7b",

    FreeSansOblique9pt7b:"FreeSansOblique9pt7b",
    FreeSansOblique12pt7b:"FreeSansOblique12pt7b",
    FreeSansOblique18pt7b:"FreeSansOblique18pt7b",
    FreeSansOblique24pt7b:"FreeSansOblique24pt7b",


    FreeSerif9pt7b:"FreeSerif9pt7b",
    FreeSerif12pt7b:"FreeSerif12pt7b",
    FreeSerif18pt7b:"FreeSerif18pt7b",
    FreeSerif24pt7b:"FreeSerif24pt7b",

    FreeSerifBold9pt7b:"FreeSerifBold9pt7b",
    FreeSerifBold12pt7b:"FreeSerifBold12pt7b",
    FreeSerifBold18pt7b:"FreeSerifBold18pt7b",
    FreeSerifBold24pt7b:"FreeSerifBold24pt7b",

    FreeSerifBoldItalic9pt7b:"FreeSerifBoldItalic9pt7b",
    FreeSerifBoldItalic12pt7b:"FreeSerifBoldItalic12pt7b",
    FreeSerifBoldItalic18pt7b:"FreeSerifBoldItalic18pt7b",
    FreeSerifBoldItalic24pt7b:"FreeSerifBoldItalic24pt7b",

    FreeSerifItalic9pt7b:"FreeSerifItalic9pt7b",
    FreeSerifItalic12pt7b:"FreeSerifItalic12pt7b",
    FreeSerifItalic18pt7b:"FreeSerifItalic18pt7b",
    FreeSerifItalic24pt7b:"FreeSerifItalic24pt7b",


    Org_01:"Org_01",
    Picopixel:"Picopixel",
    Tiny3x3a2pt7b:"Tiny3x3a2pt7b",
    TomThumb:"TomThumb"
}

let _fonts = {}

function _loadFont(fontName) {
    if (!Object.hasOwnProperty.call(_fonts, fontName)) {
        if (fontName !== "hasOwnProperty") {
            try {
                let fontSource = _fontsLookup[fontName];
                if (fontSource) {
                    let font = require("./" + fontSource);
                    if (font) {
                        _fonts[fontName] = font;
                    }
                }
            } catch(err) {
                console.error(Util.format("Unexpected error.  Font load failed for font \"%s\".", fontName));
            }
    }
    }
}


/***********************************************************
 * This module uses a Proxy to support dynamic loading of
 * fonts such that only when a font is referenced it will
 * a load (require) will be attempted
 */
const _fontHandler = {
  get: function(target, prop, receiver) {
    if (prop === "_available") {
        return Object.keys(_fontsLookup);

    } else if (prop === "_loaded") {
        return Object.keys(target);
    } else {
      _loadFont(prop);
      return Reflect.get(...arguments);
    }
  },

  set: function(target, prop, value) {
      throw new Error (_packageName + " is immutable!");
  },

  has: function(target, key) {
    return key in _fonts;
  },

  ownKeys:function (target) {
    return Reflect.ownKeys(_fonts);
  },

  /* support font deletion after load */
  deleteProperty: function(target, prop) {
    if (prop in _fonts) {
      return delete _fonts[prop];
    } else {
        return false;
    }
  }
}

module.exports = new Proxy(_fonts,_fontHandler);
