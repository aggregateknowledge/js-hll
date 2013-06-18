/*
 * Copyright 2013 Aggregate Knowledge, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Unit tests for util.js

// *****************************************************************************
test("hll.util.shiftRightUnsignedLong", function() {
    // empty upper 32bits
    (function() {
        var longValue = [ 0x00000001, 0x00 ];
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 0), [ 0x00000001, 0x00 ], "Shift right zero");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 1), [ 0x00000000, 0x00 ], "Shift right one");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 2), [ 0x00000000, 0x00 ], "Shift right two");
    })();
    (function() {
        var longValue = [ 0x0000000D/*b1101*/, 0x00 ];
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 0), [ 0x0000000D/*b1101*/, 0x00 ], "Shift right zero");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 1), [ 0x00000006/*b0110*/, 0x00 ], "Shift right one");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 2), [ 0x00000003/*b0011*/, 0x00 ], "Shift right two");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 3), [ 0x00000001/*b0001*/, 0x00 ], "Shift right three");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 4), [ 0x00000000/*b0000*/, 0x00 ], "Shift right four");
    })();

    // non-empty upper 32bits
    (function() {
        var longValue = [ 0x00000001, 0x00000001 ];
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 0), [ 0x00000001, 0x00000001 ], "Shift right zero");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 1), [-0x80000000, 0x00000000 ], "Shift right one");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 2), [ 0x40000000, 0x00000000 ], "Shift right two");
    })();
    (function() {
        var longValue = [ 0x0000000D/*b1101*/, 0x0000000B/*b1011*/ ];
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 0), [ 0x0000000D, 0x0000000B ], "Shift right zero");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 1), [-0x7FFFFFFA/*2's*/, 0x00000005 ], "Shift right one");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 2), [-0x3FFFFFFD/*2's*/, 0x00000002 ], "Shift right two");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 3), [ 0x60000001, 0x00000001 ], "Shift right three");
        deepEqual(hll.util.shiftRightUnsignedLong(longValue, 4), [-0x50000000/*2's*/, 0x00000000 ], "Shift right four");
    })();
});

// -----------------------------------------------------------------------------
test("hll.util.extractLong", function() {
    (function() {
        var bytes = [ 0x01, /*skipped*/
                      0x23, 0x45, 0x67, 0x89, 
                      0xAB, 0xCD, 0xEF, 0xFE, 
                      0xDC, 0xBA /*extra*/ ];
        var longValue = [ 0xCDEFFEDC, 0x456789AB ];
        var result = hll.util.extractLong(bytes, 2/*offset*/);
        deepEqual(result, longValue, "Extract Long");
    })();
});

// =============================================================================
test("hll.util.upperNibble", function() {
    var byteValue = 0xB3/*0b 1011 0011*/;
    // entire byte
    (function() {
        var result = hll.util.upperNibble(byteValue);
        equal(result, 0x0B, "Upper Nibble");
    })();
});

test("hll.util.lowerNibble", function() {
    var byteValue = 0xB3/*0b 1011 0011*/;
    // entire byte
    (function() {
        var result = hll.util.lowerNibble(byteValue);
        equal(result, 0x03, "Lower Nibble");
    })();
});

// =============================================================================
test("hll.util.hexToArrayBuffer", function() {
    // upper case
    (function() {
        var hex = "0x0123456789ABCDEFFEDCBA";
        var bytes = [ 0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF, 0xFE, 0xDC, 0xBA ];
        var bytesView = new Uint8Array(new ArrayBuffer(bytes.length));
        for(var i=0; i<bytes.length; i++) bytesView[i] = bytes[i];
        var result = hll.util.hexToArrayBuffer(hex);
        deepEqual(new Uint8Array(result), bytesView);
    })();

    // lower case
    (function() {
        var hex = "0x0123456789abcdeffedcba";
        var bytes = [ 0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF, 0xFE, 0xDC, 0xBA ];
        var bytesView = new Uint8Array(new ArrayBuffer(bytes.length));
        for(var i=0; i<bytes.length; i++) bytesView[i] = bytes[i];
        var result = hll.util.hexToArrayBuffer(hex);
        deepEqual(new Uint8Array(result), bytesView);
    })();
});

test("hll.util.hexToByteArray", function() {
    (function() {
        var hex = "/x0123456789ABCDEFFEDCBA";
        var bytes = [ 0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF, 0xFE, 0xDC, 0xBA ];

        var result = hll.util.hexfromByteArray(bytes);
        deepEqual(result.toUpperCase(), hex.toUpperCase());
    })();
});

// =============================================================================
test("hll.util.getBitSequenceFromByte", function() {
    var byteValue = 0xB3/*0b 1011 0011*/;

    // entire byte
    equal(hll.util.getBitSequenceFromByte(byteValue, 0, 8), 0xB3, "Entire Byte");

    // leading bits
    equal(hll.util.getBitSequenceFromByte(byteValue, 0, 1), 0x01, "1 leading bit");
    equal(hll.util.getBitSequenceFromByte(byteValue, 0, 2), 0x02, "2 leading bits");
    equal(hll.util.getBitSequenceFromByte(byteValue, 0, 3), 0x05, "3 leading bits");
    equal(hll.util.getBitSequenceFromByte(byteValue, 0, 4), 0x0B, "4 leading bits");
    equal(hll.util.getBitSequenceFromByte(byteValue, 0, 5), 0x16, "5 leading bits");
    equal(hll.util.getBitSequenceFromByte(byteValue, 0, 6), 0x2C, "6 leading bits");
    equal(hll.util.getBitSequenceFromByte(byteValue, 0, 7), 0x59, "7 leading bits");
    equal(hll.util.getBitSequenceFromByte(byteValue, 0, 8), 0xB3, "8 leading bits");

    // offset bits
    equal(hll.util.getBitSequenceFromByte(byteValue, 1, 1), 0x00, "1 leading bit offset 1");
    equal(hll.util.getBitSequenceFromByte(byteValue, 1, 2), 0x01, "2 leading bits offset 1");
    equal(hll.util.getBitSequenceFromByte(byteValue, 1, 3), 0x03, "3 leading bits offset 1");
    equal(hll.util.getBitSequenceFromByte(byteValue, 1, 4), 0x06, "4 leading bits offset 1");
    equal(hll.util.getBitSequenceFromByte(byteValue, 1, 5), 0x0C, "5 leading bits offset 1");
    equal(hll.util.getBitSequenceFromByte(byteValue, 1, 6), 0x19, "6 leading bits offset 1");
    equal(hll.util.getBitSequenceFromByte(byteValue, 1, 7), 0x33, "7 leading bits offset 1");
    
    equal(hll.util.getBitSequenceFromByte(byteValue, 2, 1), 0x01, "1 leading bit offset 2");
    equal(hll.util.getBitSequenceFromByte(byteValue, 2, 2), 0x03, "2 leading bits offset 2");
    equal(hll.util.getBitSequenceFromByte(byteValue, 2, 3), 0x06, "3 leading bits offset 2");
    equal(hll.util.getBitSequenceFromByte(byteValue, 2, 4), 0x0C, "4 leading bits offset 2");
    equal(hll.util.getBitSequenceFromByte(byteValue, 2, 5), 0x19, "5 leading bits offset 2");
    equal(hll.util.getBitSequenceFromByte(byteValue, 2, 6), 0x33, "6 leading bits offset 2");

    equal(hll.util.getBitSequenceFromByte(byteValue, 3, 1), 0x01, "1 leading bit offset 3");
    equal(hll.util.getBitSequenceFromByte(byteValue, 3, 2), 0x02, "2 leading bits offset 3");
    equal(hll.util.getBitSequenceFromByte(byteValue, 3, 3), 0x04, "3 leading bits offset 3");
    equal(hll.util.getBitSequenceFromByte(byteValue, 3, 4), 0x09, "4 leading bits offset 3");
    equal(hll.util.getBitSequenceFromByte(byteValue, 3, 5), 0x13, "5 leading bits offset 3");

    equal(hll.util.getBitSequenceFromByte(byteValue, 4, 1), 0x00, "1 leading bit offset 4");
    equal(hll.util.getBitSequenceFromByte(byteValue, 4, 2), 0x00, "2 leading bits offset 4");
    equal(hll.util.getBitSequenceFromByte(byteValue, 4, 3), 0x01, "3 leading bits offset 4");
    equal(hll.util.getBitSequenceFromByte(byteValue, 4, 4), 0x03, "4 leading bits offset 4");

    equal(hll.util.getBitSequenceFromByte(byteValue, 5, 1), 0x00, "1 leading bit offset 5");
    equal(hll.util.getBitSequenceFromByte(byteValue, 5, 2), 0x01, "2 leading bits offset 5");
    equal(hll.util.getBitSequenceFromByte(byteValue, 5, 3), 0x03, "3 leading bits offset 5");

    equal(hll.util.getBitSequenceFromByte(byteValue, 6, 1), 0x01, "1 leading bit offset 6");
    equal(hll.util.getBitSequenceFromByte(byteValue, 6, 2), 0x03, "2 leading bits offset 6");

    equal(hll.util.getBitSequenceFromByte(byteValue, 7, 1), 0x01, "1 leading bits offset 7");
});

// -----------------------------------------------------------------------------
test("hll.util.getBitSequenceValueFromByteArray", function() {
    // 0xABCDEF12 = 0b 1010 1011 1100 1101 1110 1111 0001 0010
    // 0x3456789A = 0b 0011 0100 0101 0110 0111 1000 1001 1010
    // 0xBCDEF    = 0b 1011 1100 1101 1110 1111 0000    
    var bytes = [ 0xAB, 0xCD, 0xEF, 0x12,
                  0x34, 0x56, 0x78, 0x9A, 
                  0xBC, 0xDE, 0xF0 ];

    // byte aligned
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 0, 1), 0x01, "1 leading bit");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 0, 2), 0x02, "2 leading bits");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 0, 3), 0x05, "3 leading bits");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 0, 4), 0x0A, "4 leading bits");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 0, 5), 0x15, "5 leading bits");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 0, 6), 0x2A, "6 leading bits");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 0, 7), 0x55, "7 leading bits");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 0, 8), 0xAB, "8 leading bits");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 0, 9), 0x157, "9 leading bits");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 0, 10), 0x2AF, "10 leading bits");

    // off-byte alignment
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 1, 1), 0x00, "1 leading bit offset 1");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 1, 2), 0x01, "2 leading bits offset 1");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 1, 3), 0x02, "3 leading bits offset 1");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 1, 4), 0x05, "4 leading bits offset 1");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 1, 5), 0x0A, "5 leading bits offset 1");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 1, 6), 0x15, "6 leading bits offset 1");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 1, 7), 0x2B, "7 leading bits offset 1");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 1, 8), 0x57, "8 leading bits offset 1");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 1, 9), 0xAF, "9 leading bits offset 1");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 1, 10), 0x15E, "10 leading bits offset 1");

    // aligned on 2nd byte
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 8, 1), 0x01, "1 leading bit offset 8");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 8, 2), 0x03, "2 leading bits offset 8");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 8, 3), 0x06, "3 leading bits offset 8");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 8, 4), 0x0C, "4 leading bits offset 8");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 8, 5), 0x19, "5 leading bits offset 8");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 8, 6), 0x33, "6 leading bits offset 8");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 8, 7), 0x66, "7 leading bits offset 8");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 8, 8), 0xCD, "8 leading bits offset 8");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 8, 9), 0x19B, "9 leading bits offset 8");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 8, 10), 0x337, "10 leading bits offset 8");

    // off-byte alignment
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 11, 1), 0x00, "1 leading bit offset 11");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 11, 2), 0x01, "2 leading bits offset 11");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 11, 3), 0x03, "3 leading bits offset 11");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 11, 4), 0x06, "4 leading bits offset 11");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 11, 5), 0x0D, "5 leading bits offset 11");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 11, 6), 0x1B, "6 leading bits offset 11");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 11, 7), 0x37, "7 leading bits offset 11");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 11, 8), 0x6F, "8 leading bits offset 11");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 11, 9), 0xDE, "9 leading bits offset 11");
    equal(hll.util.getBitSequenceValueFromByteArray(bytes, 11, 10), 0x1BD, "10 leading bits offset 11");
});

// =============================================================================
test("hll.util.leastSignificantBit", function() {
    // some zeros
    (function() {
        var byteValue = 0xE0/*0b11100000*/;
        var result = hll.util.leastSignificantBit(byteValue);
        equal(result, 5, "With Trailing Zeros");
    })();

    // no trailing zeros
    (function() {
        var byteValue = 0x01/*0b00000001*/;
        var result = hll.util.leastSignificantBit(byteValue);
        equal(result, 0, "No Trailing Zeros");
    })();

    // all zeros
    (function() {
        var byteValue = 0x00/*0b00000000*/;
        var result = hll.util.leastSignificantBit(byteValue);
        equal(result, -1, "All Zeros");
    })();
});

// =============================================================================
test("hll.util.ByteWriter", function() {
    // write a byte + 1bit in a bit-by-bit fashion asserting each time
    (function() {
        var writer = new hll.util.ByteWriter();
        writer.addBits(0xFF, 1);
        deepEqual(writer.getBytes(), [0x80]);

        writer.addBits(0xFF, 1);
        deepEqual(writer.getBytes(), [0xC0]);

        writer.addBits(0xFF, 1);
        deepEqual(writer.getBytes(), [0xE0]);

        writer.addBits(0xFF, 1);
        deepEqual(writer.getBytes(), [0xF0]);

        writer.addBits(0xFF, 1);
        deepEqual(writer.getBytes(), [0xF8]);

        writer.addBits(0xFF, 1);
        deepEqual(writer.getBytes(), [0xFC]);

        writer.addBits(0xFF, 1);
        deepEqual(writer.getBytes(), [0xFE]);

        writer.addBits(0xFF, 1);
        deepEqual(writer.getBytes(), [0xFF]);

        writer.addBits(0xFF, 1);
        deepEqual(writer.getBytes(), [0xFF, 0x80]);
    })();

    (function() { 
        // NOTE:  arbitrary values (simply pulled from test data)
        var v1 = 0x81/*0b 1000 0001*/,
            v2 = 0xAB/*0b 1010 1011*/,
            v3 = 0x96A5/*0b 1001 0110 1010 0101*/;

        var writer = new hll.util.ByteWriter();

        // 0b 10000001 => 0x81
        writer.addBits(v1, 8);
        deepEqual(writer.getBytes(), [ 0x81 ]);

        // 0b 10000001 011 (0 0000 padding) => 0x8160
        writer.addBits(v2, 3);
        deepEqual(writer.getBytes(), [ 0x81, 0x60 ]);
        
        // 0b 10000001 011 01011010100101 =>
        // 0b 10000001 0110 1011 0101 0010 1 (000 0000 padding) => 0x816B5280
        writer.addBits(v3, 14);
        deepEqual(writer.getBytes(), [ 0x81, 0x6B, 0x52, 0x80 ]);

        // 0b 10000001 011 01011010100101 01 =>
        // 0b 10000001 0110 1011 0101 0010 101 (0 0000 padding) => 0x816B52A0
        writer.addBits(v1, 2);
        deepEqual(writer.getBytes(), [ 0x81, 0x6B, 0x52, 0xA0 ]);
    })();
});