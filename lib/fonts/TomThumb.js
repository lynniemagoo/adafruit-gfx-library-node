'use strict';
/**
** The original 3x5 font is licensed under the 3-clause BSD license:
**
** Copyright 1999 Brian J. Swetland
** Copyright 1999 Vassilii Khachaturov
** Portions (of vt100.c/vt100.h) copyright Dan Marks
**
** All rights reserved.
**
** Redistribution and use in source and binary forms, with or without
** modification, are permitted provided that the following conditions
** are met:
** 1. Redistributions of source code must retain the above copyright
**    notice, this list of conditions, and the following disclaimer.
** 2. Redistributions in binary form must reproduce the above copyright
**    notice, this list of conditions, and the following disclaimer in the
**    documentation and/or other materials provided with the distribution.
** 3. The name of the authors may not be used to endorse or promote products
**    derived from this software without specific prior written permission.
**
** THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
** IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
** OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
** IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
** INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
** NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
** DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
** THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
** (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
** THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
**
** Modifications to Tom Thumb for improved readability are from Robey Pointer,
** see:
** http://robey.lag.net/2010/01/23/tiny-monospace-font.html
**
** The original author does not have any objection to relicensing of Robey
** Pointer's modifications (in this file) in a more permissive license.  See
** the discussion at the above blog, and also here:
** http://opengameart.org/forumtopic/how-to-submit-art-using-the-3-clause-bsd-license
**
** Feb 21, 2016: Conversion from Linux BDF --> Adafruit GFX font,
** with the help of this Python script:
** https://gist.github.com/skelliam/322d421f028545f16f6d
** William Skellenger (williamj@skellenger.net)
** Twitter: @skelliam
**
** Jan 09, 2020: Bitmaps now compressed, to fix the bounding box problem,
** because non-compressed the calculated text width were wrong.
** Andreas Merkle (web@blue-andi.de)
*/

const TomThumbBitmaps = [
    0x00,             /* 0x20 space */
    0xE8,             /* 0x21 exclam */
    0xB4,             /* 0x22 quotedbl */
    0xBE, 0xFA,       /* 0x23 numbersign */
    0x79, 0xE4,       /* 0x24 dollar */
    0x85, 0x42,       /* 0x25 percent */
    0xDB, 0xD6,       /* 0x26 ampersand */
    0xC0,             /* 0x27 quotesingle */
    0x6A, 0x40,       /* 0x28 parenleft */
    0x95, 0x80,       /* 0x29 parenright */
    0xAA, 0x80,       /* 0x2A asterisk */
    0x5D, 0x00,       /* 0x2B plus */
    0x60,             /* 0x2C comma */
    0xE0,             /* 0x2D hyphen */
    0x80,             /* 0x2E period */
    0x25, 0x48,       /* 0x2F slash */
    0x76, 0xDC,       /* 0x30 zero */
    0x75, 0x40,       /* 0x31 one */
    0xC5, 0x4E,       /* 0x32 two */
    0xC5, 0x1C,       /* 0x33 three */
    0xB7, 0x92,       /* 0x34 four */
    0xF3, 0x1C,       /* 0x35 five */
    0x73, 0xDE,       /* 0x36 six */
    0xE5, 0x48,       /* 0x37 seven */
    0xF7, 0xDE,       /* 0x38 eight */
    0xF7, 0x9C,       /* 0x39 nine */
    0xA0,             /* 0x3A colon */
    0x46,             /* 0x3B semicolon */
    0x2A, 0x22,       /* 0x3C less */
    0xE3, 0x80,       /* 0x3D equal */
    0x88, 0xA8,       /* 0x3E greater */
    0xE5, 0x04,       /* 0x3F question */
    0x57, 0xC6,       /* 0x40 at */
    0x57, 0xDA,       /* 0x41 A */
    0xD7, 0x5C,       /* 0x42 B */
    0x72, 0x46,       /* 0x43 C */
    0xD6, 0xDC,       /* 0x44 D */
    0xF3, 0xCE,       /* 0x45 E */
    0xF3, 0xC8,       /* 0x46 F */
    0x73, 0xD6,       /* 0x47 G */
    0xB7, 0xDA,       /* 0x48 H */
    0xE9, 0x2E,       /* 0x49 I */
    0x24, 0xD4,       /* 0x4A J */
    0xB7, 0x5A,       /* 0x4B K */
    0x92, 0x4E,       /* 0x4C L */
    0xBF, 0xDA,       /* 0x4D M */
    0xBF, 0xFA,       /* 0x4E N */
    0x56, 0xD4,       /* 0x4F O */
    0xD7, 0x48,       /* 0x50 P */
    0x56, 0xF6,       /* 0x51 Q */
    0xD7, 0xEA,       /* 0x52 R */
    0x71, 0x1C,       /* 0x53 S */
    0xE9, 0x24,       /* 0x54 T */
    0xB6, 0xD6,       /* 0x55 U */
    0xB6, 0xA4,       /* 0x56 V */
    0xB7, 0xFA,       /* 0x57 W */
    0xB5, 0x5A,       /* 0x58 X */
    0xB5, 0x24,       /* 0x59 Y */
    0xE5, 0x4E,       /* 0x5A Z */
    0xF2, 0x4E,       /* 0x5B bracketleft */
    0x88, 0x80,       /* 0x5C backslash */
    0xE4, 0x9E,       /* 0x5D bracketright */
    0x54,             /* 0x5E asciicircum */
    0xE0,             /* 0x5F underscore */
    0x90,             /* 0x60 grave */
    0xCE, 0xF0,       /* 0x61 a */
    0x9A, 0xDC,       /* 0x62 b */
    0x72, 0x30,       /* 0x63 c */
    0x2E, 0xD6,       /* 0x64 d */
    0x77, 0x30,       /* 0x65 e */
    0x2B, 0xA4,       /* 0x66 f */
    0x77, 0x94,       /* 0x67 g */
    0x9A, 0xDA,       /* 0x68 h */
    0xB8,             /* 0x69 i */
    0x20, 0x9A, 0x80, /* 0x6A j */
    0x97, 0x6A,       /* 0x6B k */
    0xC9, 0x2E,       /* 0x6C l */
    0xFF, 0xD0,       /* 0x6D m */
    0xD6, 0xD0,       /* 0x6E n */
    0x56, 0xA0,       /* 0x6F o */
    0xD6, 0xE8,       /* 0x70 p */
    0x76, 0xB2,       /* 0x71 q */
    0x72, 0x40,       /* 0x72 r */
    0x79, 0xE0,       /* 0x73 s */
    0x5D, 0x26,       /* 0x74 t */
    0xB6, 0xB0,       /* 0x75 u */
    0xB7, 0xA0,       /* 0x76 v */
    0xBF, 0xF0,       /* 0x77 w */
    0xA9, 0x50,       /* 0x78 x */
    0xB5, 0x94,       /* 0x79 y */
    0xEF, 0x70,       /* 0x7A z */
    0x6A, 0x26,       /* 0x7B braceleft */
    0xD8,             /* 0x7C bar */
    0xC8, 0xAC,       /* 0x7D braceright */
    0x78              /* 0x7E asciitilde */
];

/* {offset, width, height, advance cursor, x offset, y offset} */
const TomThumbGlyphs = [
    [0, 1, 1, 2, 0, -5],   /* 0x20 space */
    [1, 1, 5, 2, 0, -5],   /* 0x21 exclam */
    [2, 3, 2, 4, 0, -5],   /* 0x22 quotedbl */
    [3, 3, 5, 4, 0, -5],   /* 0x23 numbersign */
    [5, 3, 5, 4, 0, -5],   /* 0x24 dollar */
    [7, 3, 5, 4, 0, -5],   /* 0x25 percent */
    [9, 3, 5, 4, 0, -5],   /* 0x26 ampersand */
    [11, 1, 2, 2, 0, -5],  /* 0x27 quotesingle */
    [12, 2, 5, 3, 0, -5],  /* 0x28 parenleft */
    [14, 2, 5, 3, 0, -5],  /* 0x29 parenright */
    [16, 3, 3, 4, 0, -5],  /* 0x2A asterisk */
    [18, 3, 3, 4, 0, -4],  /* 0x2B plus */
    [20, 2, 2, 3, 0, -2],  /* 0x2C comma */
    [21, 3, 1, 4, 0, -3],  /* 0x2D hyphen */
    [22, 1, 1, 2, 0, -1],  /* 0x2E period */
    [23, 3, 5, 4, 0, -5],  /* 0x2F slash */
    [25, 3, 5, 4, 0, -5],  /* 0x30 zero */
    [27, 2, 5, 3, 0, -5],  /* 0x31 one */
    [29, 3, 5, 4, 0, -5],  /* 0x32 two */
    [31, 3, 5, 4, 0, -5],  /* 0x33 three */
    [33, 3, 5, 4, 0, -5],  /* 0x34 four */
    [35, 3, 5, 4, 0, -5],  /* 0x35 five */
    [37, 3, 5, 4, 0, -5],  /* 0x36 six */
    [39, 3, 5, 4, 0, -5],  /* 0x37 seven */
    [41, 3, 5, 4, 0, -5],  /* 0x38 eight */
    [43, 3, 5, 4, 0, -5],  /* 0x39 nine */
    [45, 1, 3, 2, 0, -4],  /* 0x3A colon */
    [46, 2, 4, 3, 0, -4],  /* 0x3B semicolon */
    [47, 3, 5, 4, 0, -5],  /* 0x3C less */
    [49, 3, 3, 4, 0, -4],  /* 0x3D equal */
    [51, 3, 5, 4, 0, -5],  /* 0x3E greater */
    [53, 3, 5, 4, 0, -5],  /* 0x3F question */
    [55, 3, 5, 4, 0, -5],  /* 0x40 at */
    [57, 3, 5, 4, 0, -5],  /* 0x41 A */
    [59, 3, 5, 4, 0, -5],  /* 0x42 B */
    [61, 3, 5, 4, 0, -5],  /* 0x43 C */
    [63, 3, 5, 4, 0, -5],  /* 0x44 D */
    [65, 3, 5, 4, 0, -5],  /* 0x45 E */
    [67, 3, 5, 4, 0, -5],  /* 0x46 F */
    [69, 3, 5, 4, 0, -5],  /* 0x47 G */
    [71, 3, 5, 4, 0, -5],  /* 0x48 H */
    [73, 3, 5, 4, 0, -5],  /* 0x49 I */
    [75, 3, 5, 4, 0, -5],  /* 0x4A J */
    [77, 3, 5, 4, 0, -5],  /* 0x4B K */
    [79, 3, 5, 4, 0, -5],  /* 0x4C L */
    [81, 3, 5, 4, 0, -5],  /* 0x4D M */
    [83, 3, 5, 4, 0, -5],  /* 0x4E N */
    [85, 3, 5, 4, 0, -5],  /* 0x4F O */
    [87, 3, 5, 4, 0, -5],  /* 0x50 P */
    [89, 3, 5, 4, 0, -5],  /* 0x51 Q */
    [91, 3, 5, 4, 0, -5],  /* 0x52 R */
    [93, 3, 5, 4, 0, -5],  /* 0x53 S */
    [95, 3, 5, 4, 0, -5],  /* 0x54 T */
    [97, 3, 5, 4, 0, -5],  /* 0x55 U */
    [99, 3, 5, 4, 0, -5],  /* 0x56 V */
    [101, 3, 5, 4, 0, -5], /* 0x57 W */
    [103, 3, 5, 4, 0, -5], /* 0x58 X */
    [105, 3, 5, 4, 0, -5], /* 0x59 Y */
    [107, 3, 5, 4, 0, -5], /* 0x5A Z */
    [109, 3, 5, 4, 0, -5], /* 0x5B bracketleft */
    [111, 3, 3, 4, 0, -4], /* 0x5C backslash */
    [113, 3, 5, 4, 0, -5], /* 0x5D bracketright */
    [115, 3, 2, 4, 0, -5], /* 0x5E asciicircum */
    [116, 3, 1, 4, 0, -1], /* 0x5F underscore */
    [117, 2, 2, 3, 0, -5], /* 0x60 grave */
    [118, 3, 4, 4, 0, -4], /* 0x61 a */
    [120, 3, 5, 4, 0, -5], /* 0x62 b */
    [122, 3, 4, 4, 0, -4], /* 0x63 c */
    [124, 3, 5, 4, 0, -5], /* 0x64 d */
    [126, 3, 4, 4, 0, -4], /* 0x65 e */
    [128, 3, 5, 4, 0, -5], /* 0x66 f */
    [130, 3, 5, 4, 0, -4], /* 0x67 g */
    [132, 3, 5, 4, 0, -5], /* 0x68 h */
    [134, 1, 5, 2, 0, -5], /* 0x69 i */
    [135, 3, 6, 4, 0, -5], /* 0x6A j */
    [138, 3, 5, 4, 0, -5], /* 0x6B k */
    [140, 3, 5, 4, 0, -5], /* 0x6C l */
    [142, 3, 4, 4, 0, -4], /* 0x6D m */
    [144, 3, 4, 4, 0, -4], /* 0x6E n */
    [146, 3, 4, 4, 0, -4], /* 0x6F o */
    [148, 3, 5, 4, 0, -4], /* 0x70 p */
    [150, 3, 5, 4, 0, -4], /* 0x71 q */
    [152, 3, 4, 4, 0, -4], /* 0x72 r */
    [154, 3, 4, 4, 0, -4], /* 0x73 s */
    [156, 3, 5, 4, 0, -5], /* 0x74 t */
    [158, 3, 4, 4, 0, -4], /* 0x75 u */
    [160, 3, 4, 4, 0, -4], /* 0x76 v */
    [162, 3, 4, 4, 0, -4], /* 0x77 w */
    [164, 3, 4, 4, 0, -4], /* 0x78 x */
    [166, 3, 5, 4, 0, -4], /* 0x79 y */
    [168, 3, 4, 4, 0, -4], /* 0x7A z */
    [170, 3, 5, 4, 0, -5], /* 0x7B braceleft */
    [172, 1, 5, 2, 0, -5], /* 0x7C bar */
    [173, 3, 5, 4, 0, -5], /* 0x7D braceright */
    [175, 3, 2, 4, 0, -5], /* 0x7E asciitilde */
];


const TomThumb = Object.freeze({
    "bitmap": TomThumbBitmaps,
    "glyph":  TomThumbGlyphs, 
    "first":  0x20,
    "last":   0x7E,
    "yAdvance": 6
});

module.exports = TomThumb;