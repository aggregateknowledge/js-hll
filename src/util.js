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

/**
 * @fileoverview Utility functions for manipulating bit and byte values in 
 * JavaScript. In general there are a few points to remember when working with
 * JavaScript and bit operations:
 * <ul>
 *   <li>JavaScript operates on 32 bits when performing bitwise operations. See:
 *       {@link https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Operators/Bitwise_Operators}</li>
 *   <li><tt>value >>> 0</tt> makes the number unsigned</li>
 *   <li>Only 56bits of precision are supported in integers so 'long's are 
 *       supported by using two 32bit words</li>
 * </ul>
 */

if(hll === undefined)
    var hll = { version: "1.0.0" };
if(hll.util === undefined)
    hll.util = { version: "1.0.0" };
(function() {
    // *************************************************************************
    var BITS_IN_BYTE = 8;

    // -------------------------------------------------------------------------
    var LOWER = 0/*lower 32bits of a 'long' value*/,
        UPPER = 1/*upper 32bits of a 'long' value*/;

    // *************************************************************************
    /**
     * @param {Array} a two element array that contains the upper- (index 1) 
     *        and lower-32bit (index 0) bit values of a 64bit value.
     * @param {Number} the number of bits to be shifted right. If negative or 
     *        greater than 63 then it is made positive or bounded to [0, 63]
     * @returns {Array} the specified long value shifted right by the specified 
     *          amount with the left-padded bits matching that of the sign bit. 
     */
    hll.util.shiftRightLong = function(longValue, shift) {
        shift &= 63/*by contract*/;
        if(shift == 0) return longValue/*nothing to do*/;

        var upper = longValue[UPPER]/*for convenience*/;
        if(shift < 32) {
            var lower = longValue[LOWER]/*for convenience*/;
            return [ ((lower >>> shift) | (upper << (32 - shift))),
                     (upper >> shift) ];
        } else { /*shift >= 32*/
            return [ (upper >> (shift - 32)),
                     (upper >= 0 ? 0 : -1) ];
        }
    };

    /**
     * @param {Array} a two element array that contains the upper- (index 1) 
     *        and lower-32bit (index 0) bit values of a 64bit value.
     * @param {Number} the number of bits to be shifted right. If negative or 
     *        greater than 63 then it is made positive or bounded to [0, 63]
     * @returns {Array} the specified long value shifted right by the specified 
     *          amount with the left-padded bits set to zero. 
     */
    hll.util.shiftRightUnsignedLong = function(longValue, shift) {
        shift &= 63/*by contract*/;
        if(shift == 0) return longValue/*nothing to do*/;

        var upper = longValue[UPPER]/*for convenience*/;
        if(shift < 32) {
            var lower = longValue[LOWER]/*for convenience*/;
            return [ ((lower >>> shift) | (upper << (32 - shift))),
                     (upper >>> shift) ];
        } else if(numBits == 32)
          return [ upper, 0/*clear upper*/ ];
        else /*shift > 32*/
          return [ (upper >>> (shift - 32)), 0/*clear upper*/ ];
    };
    
    // -------------------------------------------------------------------------
    /**
     * Load a long (64bit) integer from the given byte array, starting from the
     * given byte position.
     *
     * @param {Array} bytes array of bytes, with long values packed from the 0th
     *        byte in 8 byte intervals. Long values are stored big endian.
     * @param {Number} startByteIndex index into the array to the upper byte of 
     *        the long value
     * @returns {Array} a two element array that contains the upper- (index 1) 
     *          and lower-32bit (index 0) bit values of the extracted 64bit value.
     */
    hll.util.extractLong = function(bytes, startByteIndex) {
        var lower = 0,
            upper = 0;

        // load 8 bytes, big endian order
        upper |= bytes[startByteIndex    ] << 24;
        upper |= bytes[startByteIndex + 1] << 16;
        upper |= bytes[startByteIndex + 2] <<  8;
        upper |= bytes[startByteIndex + 3];
        lower |= bytes[startByteIndex + 4] << 24;
        lower |= bytes[startByteIndex + 5] << 16;
        lower |= bytes[startByteIndex + 6] <<  8;
        lower |= bytes[startByteIndex + 7];

        return [ lower >>> 0, upper >>> 0 ];
    };

    // =========================================================================
    /**
     * @param {Number} byteValue a byte
     * @returns {Number} the upper nibble (4bits) of that byte
     */
    hll.util.upperNibble = function(byteValue) {
        return byteValue >> 4;
    };

    /**
     * @param {Number} byteValue a byte
     * @returns {Number} the lower nibble (4bits) of that byte
     */
    hll.util.lowerNibble = function(byteValue) {
        return byteValue & 0x0F;
    };

    // =========================================================================
    /**
     * Decodes an array of bytes from a hex string.
     *
     * @param {String} hex string of hex digits, starts with two characters to 
     *         be discarded "\x", "0x", or similar, the number of hex digits 
     *         must be an even number, come out to a round number of bytes
     * @returns {ArrayBuffer} an <code>ArrayBuffer</code> of values representing 
     *          the bytes encoded in the hex string
     */
    hll.util.hexToArrayBuffer = function(hex) {
        hex = hex.substring(2/*discard the first two characters "0x, \x"*/);
        var length = hex.length / 2/*each hex digit is 4bits, or 1/2 byte*/;
        // allocate the byte array of the correct size.
        var arrayBuffer = new ArrayBuffer(length);
        var byteView = new Uint8Array(arrayBuffer);

        for(var i=0; i<length; i++) {
            // parse two hex digits into a byte
            var byteString = hex[i * 2] + hex[i * 2 + 1];
            byteView[i] = parseInt(byteString, 16);
        }

        return arrayBuffer;
    };

    /**
     * Encodes a hex string from an array of bytes.
     *
     * @param {Array} bytes the bytes to encode
     * @returns {String} the encoded hex string which will start with '/x'
     */
    hll.util.hexfromByteArray = function(bytes) {
        var hex = "/x";
        for(var i=0; i<bytes.length; i++) {
            var byteValue = bytes[i];
            hex += (byteValue < 0x10 ? "0" : ""/*ensure 2 digits per byte*/) + byteValue.toString(16);
        }
        return hex;
    };

    // =========================================================================
    /**
     * @param {Number} byteValue a byte
     * @param {Number} start the bit index starting from the top-bit
     * @param {Number} length the number of bits to include in the sequence
     * @returns {Number} unsigned integer representing the bits from <code>start</code>
     *          to <code>start + length</code> in the value
     */
    hll.util.getBitSequenceFromByte = function(byteValue, start, length) {
        return (byteValue >>> (BITS_IN_BYTE - (start + length))) & 
                   ((1 << length) - 1)/*mask of width 'length'*/;
    };

    // -------------------------------------------------------------------------
    /**
     * Retrieves the value of the integer between the given start and end bit 
     * indexes from an array of bytes in big-endian order.
     *
     * @param {Array} bytes the byte array from which the number is read
     * @param {Number} start the index of the start of the bit sequence
     * @param {Number} length the length of the sequence of bits. This must be 
     *        less than 32.
     * @returns {Number} the value of the specified sequence of bits
     */
    // TODO:  this can use some consistency clean-up
    hll.util.getBitSequenceValueFromByteArray = function(bytes, start, length) {
        // determine the start and end byte and bit indices of the requested bit sequence
        var byteStartIndex = start >>> 3/*divide by BITS_IN_BYTE*/;
        var byteEndIndex = (start + length) >>> 3/*divide by BITS_IN_BYTE*/;
        var bitStartIndex = start & 0x07/*% BITS_IN_BYTE*/;

        // if the value exists within a single byte, simply grab that value out of
        // the single byte
        if(byteStartIndex == byteEndIndex) return hll.util.getBitSequenceFromByte(bytes[byteEndIndex], bitStartIndex, length);

        var bitEndIndex = (start + length) & 0x07/*% BITS_IN_BYTE*/;

        // iterate through the byte array from the end byte index to the start
        // byte index, accumulating the value.
        var result = 0;
        var shift = 0;
        for(var i=byteEndIndex; i>=byteStartIndex; i--) {
            var byteValue;
            if(i == byteStartIndex)
                byteValue = hll.util.getBitSequenceFromByte(bytes[i], bitStartIndex, BITS_IN_BYTE - bitStartIndex);
            else if(i == byteEndIndex)
                byteValue = hll.util.getBitSequenceFromByte(bytes[i], 0, bitEndIndex);
            else /*use the entire byte, if it is not the start or end bytes*/
                byteValue = bytes[i];

            result |= byteValue << shift;

            if(i == byteEndIndex)
                shift += bitEndIndex;
            else
                shift += BITS_IN_BYTE;
        }

        return result;
    };

    // =========================================================================
    // least significant bit
    // REF:  http://stackoverflow.com/questions/757059/position-of-least-significant-bit-that-is-set
    // REF:  http://www-graphics.stanford.edu/~seander/bithacks.html
    var LEAST_SIGNIFICANT_BIT = [/*0-based*/
        -1, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
         4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0
    ];
    /**
     * @param {Number} value a 32bit value for which the least-significant bit
     *        set is desired. This cannot be null, greater than 32bits, or unspecified.
     * @returns {Number} the 0-based position of the least-significant bit set.
     */
    hll.util.leastSignificantBit = function(value) {
        if(value == 0) return -1/*by contract*/;
        if((value & 0x0000FF) != 0) return LEAST_SIGNIFICANT_BIT[( (value >>>  0) & 0xFF)] +  0;
        if((value & 0x00FFFF) != 0) return LEAST_SIGNIFICANT_BIT[( (value >>>  8) & 0xFF)] +  8;
        if((value & 0xFFFFFF) != 0) return LEAST_SIGNIFICANT_BIT[( (value >>> 16) & 0xFF)] + 16;
        return LEAST_SIGNIFICANT_BIT[( (value >>> 24) & 0xFF)] + 24;
    };

    // *************************************************************************
    /**
     * Creates a new mechanism for writing data into a byte array.
     * @constructor
     */
    hll.util.ByteWriter = function() {
        var self = this;

        var currentByte = 0;
        var bytes = [];
        var remainingBitsInByteCount = BITS_IN_BYTE;

        // ---------------------------------------------------------------------
        /**
         * Write bits to the tail end of the byte array writing from the upper
         * bits of each byte.
         *
         * @param {Number} value the value to add to the byte array
         * @param {Number} bitCount number of bits starting from the lower bits
         *         of the value to add to the byte array, at most 32 bits
         */
        self.addBits = function(value, bitCount) {
            var remainingBitsInValueCount = bitCount;
            while(remainingBitsInValueCount > 0) {
                // the value is taken from the lower bits of 'value' but read 
                // starting from the upper bit(s)
                var writeBitCount = Math.min(remainingBitsInValueCount, remainingBitsInByteCount);
                var writeValue = ((value >>> (remainingBitsInValueCount - writeBitCount)) &
                                  ((1 << writeBitCount) - 1)/*mask of width 'writeBitCount'*/) >>> 0;

                // writing starts at the upper bit(s)
                currentByte |= (writeValue << (remainingBitsInByteCount - writeBitCount));

                remainingBitsInValueCount -= writeBitCount;
                remainingBitsInByteCount -= writeBitCount;
                if(remainingBitsInByteCount <= 0) {
                    bytes.push(currentByte);
                    currentByte = 0/*clear*/;
                    remainingBitsInByteCount = BITS_IN_BYTE/*reset*/;
                } /* else -- not a full byte yet */
            }
        };

        /**
         * @returns {Array} the bytes that have been {@link #addBits() added}
         *          to this writer. Modifying this array will modify the internal
         *          storage.
         */
        self.getBytes = function() {
            if(remainingBitsInByteCount < BITS_IN_BYTE) { /*bits in currentByte haven't been added to bytes yet*/
                var copyBytes = bytes.slice(0)/*clone*/;
                    copyBytes.push(currentByte);
                return copyBytes;
            } else/*no addition bits have been added*/
                return bytes;
        };
    };
})();