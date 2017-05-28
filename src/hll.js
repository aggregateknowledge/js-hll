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
 * @fileoverview A JavaScript implementation of {@link http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf HyperLogLog}
 * whose goal is to be {@link https://github.com/aggregateknowledge/hll-storage-spec storage-compatible} with other similar offerings
 * from {@link http://blog.aggregateknowledge.com/ Aggregate Knowledge}.<p/>
 * 
 * Hashing of raw values may be simplified using AK's {@link https://github.com/aggregateknowledge/js-murmur3-128 JavaScript Murmur3 128bit}
 * implementation.
 *
 * <h3>Overview</h3>
 * HyperLogLog is a fixed-size, set-like structure used for distinct value 
 * counting with tunable precision. For example, in 1280 bytes HLL can estimate 
 * the count of tens of billions of distinct values with only a few percent error.<p/>
 * 
 * <h5>log2m</h5>
 * The log-base-2 of the number of registers used in the HyperLogLog algorithm. 
 * It must be at least 4 and at most 24 (but it is recommended to be no more 
 * than 17). This parameter tunes the accuracy of the HyperLogLog structure. 
 * The relative error is given by the expression <em>&plusmn;1.04/&radic;(2^log2m)</em>. 
 * Note that increasing <tt>log2m</tt> by 1 doubles the required storage for the 
 * HLL.<p/>
 * 
 * <h5>registerWidth</h5>
 * The number of bits used per register in the HyperLogLog algorithm. It 
 * must be at least 1 and at most 5. This parameter, in conjunction with <tt>log2m</tt>, 
 * tunes the maximum cardinality of the set whose cardinality can be estimated. 
 * For clarity, a table of <tt>registerWidth</tt>s and <tt>log2m</tt>s, the 
 * approximate maximum cardinality and the size of the resulting structure
 * that can be estimated with those parameters is provided below.<p/>
 * 
 * <table>
 *   <th><code>logm2</code></th>
 *   <th><code>regwidth=1</code></th>
 *   <th><code>regwidth=2</code></th>
 *   <th><code>regwidth=3</code></th>
 *   <th><code>regwidth=4</code></th>
 *   <th><code>regwidth=5</code></th>
 *   <tr>
 *     <td>10</td>
 *     <td>7.4e+02 <em><sub>128B</sub></em></td>
 *     <td>3.0e+03 <em><sub>256B</sub></em></td>
 *     <td>4.7e+04 <em><sub>384B</sub></em></td>
 *     <td>1.2e+07 <em><sub>512B</sub></em></td>
 *     <td>7.9e+11 <em><sub>640B</sub></em></td>
 *   </tr>
 *   <tr>
 *     <td>11</td>
 *     <td>1.5e+03 <em><sub>256B</sub></em></td>
 *     <td>5.9e+03 <em><sub>512B</sub></em></td>
 *     <td>9.5e+04 <em><sub>768B</sub></em></td>
 *     <td>2.4e+07 <em><sub>1.0KB</sub></em></td>
 *     <td>1.6e+12 <em><sub>1.2KB</sub></em></td>
 *   </tr>
 *   <tr>
 *     <td>12</td>
 *     <td>3.0e+03 <em><sub>512B</sub></em></td>
 *     <td>1.2e+04 <em><sub>1.0KB</sub></em></td>
 *     <td>1.9e+05 <em><sub>1.5KB</sub></em></td>
 *     <td>4.8e+07 <em><sub>2.0KB</sub></em></td>
 *     <td>3.2e+12 <em><sub>2.5KB</sub></em></td>
 *   </tr>
 *   <tr>
 *     <td>13</td>
 *     <td>5.9e+03 <em><sub>1.0KB</sub></em></td>
 *     <td>2.4e+04 <em><sub>2.0KB</sub></em></td>
 *     <td>3.8e+05 <em><sub>3KB</sub></em></td>
 *     <td>9.7e+07 <em><sub>4KB</sub></em></td>
 *     <td>6.3e+12 <em><sub>5KB</sub></em></td>
 *   </tr>
 *   <tr>
 *     <td>14</td>
 *     <td>1.2e+04 <em><sub>2.0KB</sub></em></td>
 *     <td>4.7e+04 <em><sub>4KB</sub></em></td>
 *     <td>7.6e+05 <em><sub>6KB</sub></em></td>
 *     <td>1.9e+08 <em><sub>8KB</sub></em></td>
 *     <td>1.3e+13 <em><sub>10KB</sub></em></td>
 *   </tr>
 *   <tr>
 *     <td>15</td>
 *     <td>2.4e+04 <em><sub>4KB</sub></em></td>
 *     <td>9.5e+04 <em><sub>8KB</sub></em></td>
 *     <td>1.5e+06 <em><sub>12KB</sub></em></td>
 *     <td>3.9e+08 <em><sub>16KB</sub></em></td>
 *     <td>2.5e+13 <em><sub>20KB</sub></em></td>
 *   </tr>
 *   <tr>
 *     <td>16</td>
 *     <td>4.7e+04 <em><sub>8KB</sub></em></td>
 *     <td>1.9e+05 <em><sub>16KB</sub></em></td>
 *     <td>3.0e+06 <em><sub>24KB</sub></em></td>
 *     <td>7.7e+08 <em><sub>32KB</sub></em></td>
 *     <td>5.1e+13 <em><sub>40KB</sub></em></td>
 *   </tr>
 *   <tr>
 *     <td>17</td>
 *     <td>9.5e+04 <em><sub>16KB</sub></em></td>
 *     <td>3.8e+05 <em><sub>32KB</sub></em></td>
 *     <td>6.0e+06 <em><sub>48KB</sub></em></td>
 *     <td>1.5e+09 <em><sub>64KB</sub></em></td>
 *     <td>1.0e+14 <em><sub>80KB</sub></em></td>
 *   </tr>
 * </table>
 * 
 * <h3>Usage</h3>
 * Refer to the unit tests (<tt>hll-test.js</tt>) for many usage examples.<p/>
 * 
 * Hashing and adding a value to a new HLL:
 * <pre>
 *     var seed = 0x123456;
 *     var rawKey = new ArrayBuffer(8);
 *     var byteView = new Int8Array(rawKey);
 *         byteView[0] = 0xDE; byteView[1] = 0xAD; byteView[2] = 0xBE; byteView[3] = 0xEF;
 *         byteView[4] = 0xFE; byteView[5] = 0xED; byteView[6] = 0xFA; byteView[7] = 0xCE;
 *     var hllSet = new hll.HLL(13/&#42;log2m&#42;/, 5/&#42;registerWidth&#42;/);
 *         hllSet.addRaw(murmur3.hash128(rawKey, seed));
 * </pre>
 * 
 * Retrieving the cardinality of an HLL:
 * <pre>
 *     console.log(hllSet.cardinality());
 * </pre>
 * 
 * Unioning two HLLs together (and retrieving the resulting cardinality):
 * <pre>
 *     var hllSet1 = new hll.HLL(13/&#42;log2m&#42;/, 5/&#42;registerWidth&#42;/),
 *         hllSet2 = new hll.HLL(13/&#42;log2m&#42;/, 5/&#42;registerWidth&#42;/);
 * 
 *     // ... (add values to both sets) ...
 *
 *     hllSet1.union(hllSet2)/&#42;modifies hllSet1 to contain the union&#42;/;
 *     console.log(hllSet1.cardinality());
 * </pre>
 * 
 * Cloning an HLL:
 * <pre>
 *     var hllSet1 = new hll.HLL(13/&#42;log2m&#42;/, 5/&#42;registerWidth&#42;/),
 *         hllSet2 = new hll.HLL(13/&#42;log2m&#42;/, 5/&#42;registerWidth&#42;/);
 * 
 *     // ... (add values to both sets) ...
 *
 *     var hllUnion = hllSet1.clone();
 *     hllUnion.union(hllSet2)/&#42;modifies hllUnion to contain the union&#42;/;
 *     // both 'hllSet1' and 'hllSet2' are unmodified
 *     console.log(hllUnion.cardinality());
 * </pre>
 *
 * Reading an HLL from its hex form (for example, retrieved from a PostgreSQL database):
 * <pre>
 *     var hllSet = hll.fromHexString(hllHexString).hllSet;
 *     console.log(hllSet.cardinality());
 * </pre>
 *
 * Writing an HLL to its hex form (for example, to be inserted into a PostgreSQL database):
 * <pre>
 *     ...
 *     var hllHexString = hllSet.toHexString();
 *     ...
 * </pre>
 *
 * For more information on the hex format and other storage-compatible implementations,
 * see {@link https://github.com/aggregateknowledge/hll-storage-spec here}.
 */

if(typeof hll === "undefined")
    var hll = { version: "1.0.0" };
(function () {
    // ** Config ***************************************************************
    // default register width and number when loading explicit sets
    var DEFAULT_REGISTER_WIDTH = 5/*schema v1*/,
        DEFAULT_LOG2M = 13/*schema v1*/;

    // -------------------------------------------------------------------------
    var LOWER = 0/*lower 32bits of the hashed value*/,
        UPPER = 1/*upper 32bits of the hashed value*/;

    // ** Set Representation ***************************************************
    /**
     * Creates a new HLL structure with the specified precision.
     *
     * @param {Number} [log2m=DEFAULT_LOG2M] the log-base-2 of the number of 
     *        registers. This cannot be less than four or greater than 24.
     * @param {Number} [registerWidth=DEFAULT_REGISTER_WIDTH] the width in bits 
     *        of the register values. This is <code>ceil(log2(log2(expectedUniqueElements)))</code>
     *        and cannot be less than one or greater than five.
     * @constructor
     */
    // NOTE:  the register width is limited to at most 5 since that provides for
    //        a maximum register value of 31 which is the limit of the JavaScript
    //        bit shifting operators.
    hll.HLL = function(log2m, registerWidth) {
        var self = this;

        if(arguments.length < 1) log2m = DEFAULT_LOG2M;
        if(arguments.length < 2) registerWidth = DEFAULT_REGISTER_WIDTH;
        if((log2m < 4) || (log2m > 24)) throw new Error("Register width must be between 4 and 24 inclusive (log2m = " + log2m + ").");
        if((registerWidth < 1) || (registerWidth > 5)) throw new Error("Register width must be between 1 and 5 inclusive (registerWidth = " + registerWidth + ").");

        // .. initialization ...................................................
        self.log2m = log2m;
        self.m = 1 << log2m/*for convenience*/;

        self.registerWidth = registerWidth;

        // NOTE:  there are two approaches that can be taken on storage:
        //        1.  Simply use an array of register values. This results in
        //            the easiest to read and maintain code but consumes considerably
        //            more memory than is necessary. (64bits are used for every
        //            register even though the register width is always less
        //            than or equal to 6.)
        //        2.  Use an ArrayBuffer to encode exactly '2^log2m * registerWidth'
        //            bits. This results in highly complex code to both read and
        //            maintain but is provides for optimal storage.
        //        Currently the first approach is taken.
        self.registers = [];
        for(var i=self.m-1; i>=0; i--) self.registers.push(0);

        // .. initialize meta values ...........................................
        // register count/width meta values
        var maxRegisterValue = ((1 << self.registerWidth/*2^registerWidth*/) - 1) >>> 0;
        var registerIndexMask = ((1 << log2m) - 1) >>> 0/*the mask applied to the lower-4bytes of the hashed value to get the register index*/;

        // cardinality estimation meta values
        var PW_BITS = maxRegisterValue - 1,
            L = PW_BITS + log2m,
            TWO_TO_L = Math.pow(2, L)/*L may be larger than 32 so '<<' cannot be used*/;

        var LARGE_ESTIMATOR_CUTOFF = (TWO_TO_L / 30),
            SMALL_ESTIMATOR_CUTOFF = 5 * self.registers.length/*m*/ / 2;

        var ALPHA_M_SQUARED = cardinalityAlphaMSquared(self.m);

        // =====================================================================
        function rho(value/*w*/) {
            // NOTE:  by contract the value must be 32bits (therefore only LOWER is needed)
            // NOTE: there are two approaches: mask "value" so that there are 1's
            //       in the upper bits or do a min. The former is more performant
            //       the latter is easier to read.
            var lsb = hll.util.leastSignificantBit(value[LOWER]) + 1/*since 1-based*/;
            return Math.min(maxRegisterValue, lsb);
        };
        
        /**
         * @param {Array} a two element array that contains the upper- (index 1) 
         *        and lower-32bit (index 0) bit values (of a 64bit hashed value) 
         *        to be added to this set. This must be specified and cannot be 
         *        null.  
         * @returns {hll.HLL}
         */
        self.addRaw = function(hashValue) {
            var registerIndex = hashValue[LOWER] & registerIndexMask/*by contract <32bits so LOWER is sufficient*/;
            var registerValue = rho(hll.util.shiftRightUnsignedLong(hashValue, log2m));
            self.registers[registerIndex] = Math.max(self.registers[registerIndex], registerValue);
        };

        // ---------------------------------------------------------------------
        /**
         * @returns {Number} the estimated cardinality of the set as a floating 
         *          point number.
         * @see http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf
         */
        self.algorithmCardinality = function() {
            var m = self.m/*for convenience*/;

            // compute the "indicator function" -- sum(2^(-M[j])) where M[j] is 
            // the 'j'th register value
            var sum = 0.0;
            var numberOfZeroes = 0/*"V" in the paper*/;
            var registers = self.registers/*for performance*/;
            for(var j=m-1; j>=0; j--) {
                var registerValue = registers[j];

                sum += 1.0 / ((1 << registerValue/*2^registerValue*/)/*registerValue < 32 by contract*/ >>> 0)/*unsigned*/;
                if(registerValue == 0) numberOfZeroes++;
            }

            // apply the estimate and correction to the indicator function
            var estimator = ALPHA_M_SQUARED / sum;
            if((numberOfZeroes != 0) && (estimator < SMALL_ESTIMATOR_CUTOFF))
                return m * Math.log(m / numberOfZeroes);
            else if(estimator <= LARGE_ESTIMATOR_CUTOFF)
                return estimator;
            else
                return (-1 * TWO_TO_L) * Math.log(1.0 - (estimator / TWO_TO_L));
        };

        /**
         * @returns {Number} the estimated cardinality of the set <code>ceil</code>'d
         *          up to an integral number.
         * @see http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf
         */
        self.cardinality = function() {
            return Math.ceil(self.algorithmCardinality());
        };

        // ---------------------------------------------------------------------
        /**
         * @return {Number} the standard error based on log2m (the number of registers)
         * @see http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf
         */
        self.cardinalityError = function() {
            return 1.04 / Math.sqrt(1 << log2m/*2^log2m = m*/);
        };

        // =====================================================================
        /**
         * @param {hll.HLL} otherSet another HLL. <code>log2m</code> and <code>registerWidth</code> 
         *        must be identical for the two sets otherwise an exception is 
         *        thrown. This set is not modified in any way.
         * @returns {hll.HLL} the unioned results (which is this object).
         * @throws {Error} if the <code>log2m</code> and <code>registerWidth</code>
         *         of this set and the specified one do not match. 
         */
        self.union = function(otherSet) {
            // NOTE:  currently precluding unioning with different sized sets
            if((self.log2m != otherSet.log2m) || (self.registerWidth != otherSet.registerWidth)) throw new Error("Union of sets with different 'log2m' " + ((self.log2m == otherSet.log2m) ? "" : "(" + self.log2m + " != " + otherSet.log2m + ") ") + "or 'registerWidth'" + ((self.registerWidth == otherSet.registerWidth) ? "" : " (" + self.registerWidth + " != " + otherSet.registerWidth + ")") + ".");

            var selfRegisterCount = self.m,
                otherRegisterCount = otherSet.m;
            var registerCount = Math.min(selfRegisterCount, otherRegisterCount);

// TODO:  re-incorporate when contract updated
// TODO:  don't change 'otherSet' since it's not in the contract. Make a clone.
//            // 'fold' the larger set until it is the same size as this set
//            var largerSet = selfRegisterCount > otherRegisterCount ? self : otherSet;
//            while(largerSet.registers.length != registerCount)
//                largerSet.fold();

            var selfRegisters = self.registers/*for performance*/, 
                otherRegisters = otherSet.registers/*for performance*/;
            for(var i=registerCount-1; i>=0; i--)
                selfRegisters[i] = Math.max(selfRegisters[i], otherRegisters[i]);

            return self;
        };

        /**
         * 'Folds' a set down to the specified <code>log2m</code> as per 
         * {@link http://blog.aggregateknowledge.com/2012/09/12/set-operations-on-hlls-of-different-sizes/}.
         * 
         * @param {Number} the desired <code>log2m</code> (which determines the
         *        relative error) of the HLL. This cannot be less than one or
         *        greater than the current value.
         * @returns {hll.HLL} a duplicate of this set, folded to match the specified
         *          <code>log2m</code>. The current set is left untouched.
         * @throws {Error} if the specified <code>log2m</code> is less than two
         *         or greater than the current value.
         */
        self.fold = function(log2m) {
            if(log2m == self.log2m) return self.clone()/*trivial case -- by contract it must be a duplicate*/;
            if((log2m < 1) || (log2m > self.log2m)) throw new Error("'log2m' cannot be less than 1 or greater than the current value.");

            // assume log2m=6 and registerWidth=5. Then there will be 6bits that
            // compose the index (I) and at most '2^5 - 1 = 31' bits that compose
            // the register value (V):
            //    0b ---- ---- ---V VVVV  VVVV VVVV VVVV VVVV  VVVV VVVV VVII IIII
            // Folding by one (log2m=6 -> log2m=5) means that one bit that was
            // previously in the index is now part of the register value:
            //    0b ---- ---- ---- VVVV  VVVV VVVV VVVV VVVV  VVVV VVVV VvVI IIII
            // (shown as a lower case 'v' to make it clear). Since the HLL 
            // algorithm uses the least-significant set bit ('1') of the register 
            // value, there are two possible cases:
            // 1.  The upper bit of the old index (which is now the lower bit
            //     of the register value) was set to '1' in which case the new
            //     register value is '1';
            // 2.  The upper bit of the old index was set to '0' in which case
            //     the new register value is 'min(oldRegisterValue + 1, 31)';
            // Case #1 means that the upper half of the registers can be ignored
            // since the *maximum* register value of case #1 is '1' where as the
            // *minimum* register value in case #2 is '1'.
            // This can be easily extended to folding 'n' times.
            // SEE:  http://blog.aggregateknowledge.com/2013/03/25/hyperloglog-engineering-choosing-the-right-bits/
            // NOTE:  since 'registerWidth' does not change the same 'maxRegisterValue'
            //        is to be used
            var hllSet = new hll.HLL(log2m, self.registerWidth);
            var foldedRegisters = hllSet.registers/*for performance*/,
                selfRegisters = self.registers/*for performance*/;
            var difference = self.log2m - log2m,
                foldedM = hllSet.m/*by definition*/;
            for(var i=foldedM-1; i>=0; i--)
                foldedRegisters[i] = Math.min(selfRegisters[i] + difference, maxRegisterValue)/*bound above by 'maxRegisterValue'*/;

            return hllSet;
        };

        // =====================================================================
        /**
         * @returns {hll.HLL} a clone of this set (with no remaining references
         *          to the original set.
         */
        self.clone = function() {
            var clone = new hll.HLL(self.log2m, self.registerWidth);
            // copy all registers
            var selfRegisters = self.registers/*for performance*/, 
                cloneRegisters = clone.registers/*for performance*/;
            for(var i=self.m-1; i>=0; i--)
                cloneRegisters[i] = selfRegisters[i];

            return clone;
        };

        /**
         * @returns {hll.HLL} this object with all of its register values set 
         *          to zero.
         */
        self.clear = function() {
            var registers = self.registers/*for performance*/; 
            for(var i=self.m-1; i>=0; i--)
                registers[i] = 0/*clear*/;

            return self;
        };

        // =====================================================================
        /**
         * Encodes this structure into a hexadecimal string in the format 
         * described in <code>STORAGE.markdown</code> schema version 1. Only 
         * <tt>FULL</tt> representations are supported.
         * 
         * @return {String} the string that encodes this HLL structure
         */
        self.toHexString = function() {
            // byte layout VPCB*'
            var writer = new hll.util.ByteWriter();

            // version byte: schema 1, full
            writer.addBits(0x14, 8);
            // parameter byte:
            // *  top 3 bits: registerWidth - 1
            // *  bottom 5 bits: log2m
            writer.addBits(registerWidth - 1, 3);
            writer.addBits(log2m, 5);
            // cutoff byte
            writer.addBits(0, 8)/*1 bit of padding, explicit enabled = 0, explicit cuttoff = 0*/;

            // The data bytes encode the register values in 'registerWidth'-bit-wide 
            // "short words". The words are stored in _ascending_ index order

            // If 'BITS = registerWidth * numberOfRegisters' is not divisible by
            // 8, then 'BITS % 8' padding bits are added to the _bottom_ of the 
            // _last_ byte of the array

            // The short words are written from the top of the zero-th byte of
            // the array to the bottom of the last byte of the array, with the
            // high bits of the short words toward the high bits of the byte.

            var m = self.m/*for performance*/;
            var registers = self.registers/*for performance*/;
            for(var i=0; i<m; i++) /*NOTE: iteration order matters*/
                writer.addBits(registers[i], registerWidth);
            // NOTE:  ByteWriter automatically has padding to fit evenly into a byte

            return hll.util.hexfromByteArray(writer.getBytes());
        };
    };

    // =========================================================================
    /**
     * @param {Number} m must be a power of two, cannot be less than 16
     *        (2<sup>4</sup>), and cannot be greater than 65536 (2<sup>16</sup>).
     * @returns {Number} gamma times <code>m</code> squared where gamma is based 
     *          on the value of <code>m</code>
     * @throws {Error} if <code>m</code> is less than 16
     */
    function cardinalityAlphaMSquared(m) {
        switch(m) {
            case 1/*2^0*/:
            case 2/*2^1*/:
            case 4/*2^2*/:
            case 8/*2^3*/:
                throw new Error("'m' cannot be less than 16 (" + m + " < 16).");

            case 16/*2^4*/:
                return 0.673 * m * m;

            case 32/*2^5*/:
                return 0.697 * m * m;

            case 64/*2^6*/:
                return 0.709 * m * m;

            default/*>2^6*/:
                return (0.7213 / (1.0 + 1.079 / m)) * m * m;
        }
    }

    // ** Parsing **************************************************************
    // number of bits in a byte
    var BITS_IN_BYTE = 8;

    // schema version constants
    var SCHEMA1 = 1;

    // algorithm constants
    hll.algorithm = {
        EMPTY: "Empty",
        EXPLICIT: "Explicit",
        SPARSE: "Sparse",
        FULL: "Full",
        UNDEFINED: "Undefined"
    };

    // schema version 1 algorithm indexes
    var schema1 = {
        UNDEFINED : 0,
        EMPTY : 1,
        EXPLICIT : 2,
        SPARSE : 3,
        FULL : 4
    };

    // =========================================================================
    /**
     * Decodes an HLL encoded in the specified hexadecimal string as defined by
     * <code>STORAGE.markdown</code>.
     * 
     * @param {String} string the string to decode
     * @returns {{hllSet: hll.HLL, version: Number, algorithm: String}}
     *          <code>set</code> the HLL object loaded from the hex string.
     *          <code>version</code> the schema version number. 
     *          <code>algorithm</code> the name of the encoding {@link hll.algorithm algorithm}. 
     */
    hll.fromHexString = function(string) {
        var arrayBuffer = hll.util.hexToArrayBuffer(string);
        return parseSet(arrayBuffer);
    };

    /**
     * @param  {ByteArray} arrayBuffer an encoded HLL as defined by <code>STORAGE.markdown</code>.
     * @returns {{hllSet: hll.HLL, version: Number, algorithm: String}}
     *          <code>hllSet</code> the HLL object loaded from the hex string.
     *          <code>version</code> the schema version number. 
     *          <code>algorithm</code> the name of the encoding {@link hll.algorithm algorithm}. 
     */
    var parseSet = function(arrayBuffer) {
        // SEE: STORAGE.markdown

        // byte array format: V*
        var bytes = new Uint8Array(arrayBuffer);

        // the schema value is stored in the upper nibble of the version byte,
        // while the algorithm version is stored in the lower nibble of that byte
        var version = hll.util.upperNibble(bytes[0/*V*/]),
            algorithm = hll.util.lowerNibble(bytes[0/*V*/]);

        if(version == SCHEMA1) {
            switch(algorithm) {
                case schema1.UNDEFINED:
                    return { hllSet: schema1_empty(arrayBuffer), version: version, algorithm: hll.algorithm.UNDEFINED };
                case schema1.EMPTY:
                    return { hllSet: schema1_empty(arrayBuffer), version: version, algorithm: hll.algorithm.EMPTY };
                case schema1.EXPLICIT:
                    return { hllSet: schema1_explicit(arrayBuffer), version: version, algorithm: hll.algorithm.EXPLICIT };
                case schema1.SPARSE:
                    return { hllSet: schema1_sparse(arrayBuffer), version: version, algorithm: hll.algorithm.SPARSE };
                case schema1.FULL:
                    return { hllSet: schema1_full(arrayBuffer), version: version, algorithm: hll.algorithm.FULL };
                default:
                    throw new Error("Unknown schema version 1 algorithm (index): " + algorithm);
            }
        } else /*unknown*/
            throw new Error("Unknown schema version: " + version);
    };

    // == Schema v1 ============================================================
    // @param {Number} parameterByte the parameter byte that is to be parsed 
    // @returns {{ log2m: Number, registerWidth: Number }} the parsed register
    //          width and log2m
    function schema1_parameters(parameterByte) {
        // highest 3 bits encode the value 'registerWidth - 1' and the remaining 
        // 5 bits encode 'log2m'
        return { registerWidth: hll.util.getBitSequenceFromByte(parameterByte, 0, 3) + 1,
                 log2m: hll.util.getBitSequenceFromByte(parameterByte, 3, 5) };
    }
    // @param {ArrayBuffer} arrayBuffer array buffer encoding a schema v1 'FULL' 
    // @returns {hll.HLL} a new HLL decoded from the <code>ArrayBuffer</code>
    function schema1_full(arrayBuffer) {
        // byte array format: VPCB*
        var bytes = new Uint8Array(arrayBuffer);

        var parameters = schema1_parameters(bytes[1/*P*/]);
        var registerWidth = parameters.registerWidth/*for convenience*/,
            log2m = parameters.log2m/*for convenience*/,
            m = 1 << log2m/*2^log2m*/;

        // the values are stored in 'registerWidth' bit wide ascending sequence
        var registers = [];
        var byteOffset = 3 * BITS_IN_BYTE/*VPC*/;
        for(var i=m-1; i>=0; i--) {
            registers.push(hll.util.getBitSequenceValueFromByteArray(bytes, byteOffset, registerWidth));
            byteOffset += registerWidth;
        }

        var hllSet = new hll.HLL(log2m, registerWidth);
            hllSet.registers = registers;
        return hllSet;
    }
    // @param {ArrayBuffer} arrayBuffer array buffer encoding a schema v1 'SPARSE' 
    // @returns {hll.HLL} a new HLL decoded from the <code>ArrayBuffer</code>
    function schema1_sparse(arrayBuffer) {
        // byte array format: VPCB*
        var bytes = new Uint8Array(arrayBuffer);
        return common_sparse(arrayBuffer, 3/*VPC*/, schema1_parameters(bytes[1/*P*/]));
    }
    // @param {ArrayBuffer} arrayBuffer array buffer encoding a schema v1 'EMPTY' 
    // @returns {hll.HLL} a new HLL decoded from the <code>ArrayBuffer</code>
    function schema1_empty(arrayBuffer) {
        var bytes = new Uint8Array(arrayBuffer);
        return common_empty(schema1_parameters(bytes[1/*P*/]));
    }
    // @param {ArrayBuffer} arrayBuffer array buffer encoding a schema v1 'EXPLICIT' 
    // @returns {hll.HLL} a new HLL decoded from the <code>ArrayBuffer</code>
    function schema1_explicit(arrayBuffer) {
        // byte array format: VPCB{8}*
        var bytes = new Uint8Array(arrayBuffer);
        return common_explicit(arrayBuffer, 3/*VPC*/, schema1_parameters(bytes[1/*P*/]));
    }

    // == Decoding Common ======================================================
    // @param {{ log2m: Number, registerWidth: Number }} parameters the register
    //        width and log2m parameters
    // @returns {hll.HLL} a new HLL with the specified parameters
    function common_empty(parameters) {
        return new hll.HLL(parameters.log2m, parameters.registerWidth);
    }

    // @param {ArrayBuffer} arrayBuffer array buffer encoding an 'EXPLICIT' set
    // @param {Number} offset the offset in the array buffer to the data bytes
    // @param {{ log2m: Number, registerWidth: Number }} parameters the register
    //        width and log2m parameters
    // @returns {hll.HLL} a new HLL decoded from the <code>ArrayBuffer</code>
    function common_explicit(arrayBuffer, offset, parameters) {
        var hllSet = new hll.HLL(parameters.log2m, parameters.registerWidth);

        // Each block of 8 bytes represent a signed 64-bit integer (sign bit + 
        // 63 value bits). These integers are encoded as big-endian (with sign-bit 
        // at highest position), and are the "contents" of the multiset.
        var bytes = new Uint8Array(arrayBuffer);
        var byteOffset = offset;
        while(byteOffset < bytes.length) {
            // load the tuple from the byte array at the given offset
            var value = hll.util.extractLong(bytes, byteOffset);
            hllSet.addRaw(value);

            // move forward 8 bytes to the next value;
            byteOffset += 8/*bytes in 'long'*/;
        }

        return hllSet;
    }

    // @param {ArrayBuffer} arrayBuffer array buffer encoding an 'EXPLICIT' set
    // @param {Number} offset the offset in the byte array to the data bytes
    // @param {{ log2m: Number, registerWidth: Number }} parameters the register
    //        width and log2m parameters
    // @returns {hll.HLL} a new HLL decoded from the <code>ArrayBuffer</code>
    function common_sparse(arrayBuffer, offset, parameters) {
        var registerWidth = parameters.registerWidth/*for convenience*/,
            log2m = parameters.log2m/*for convenience*/,
            m = 1 << log2m/*2^log2m*/;

        var registers = [];
        for(var i=m-1; i>=0; i--) registers.push(0/*initialize*/);

        // If 'BITS = registerWidth * m' is not divisible by 8, then 'BITS % 8' 
        // padding bits are added to top of the first byte of the array account 
        // for this padding
        var bitOffset = offset * BITS_IN_BYTE/*after offset*/;
            bitOffset += (m * registerWidth) % BITS_IN_BYTE;

        var bytes = new Uint8Array(arrayBuffer);
        var registerCount = Math.floor(((bytes.length - offset)/*data bytes*/ * BITS_IN_BYTE) / (log2m + registerWidth));
        for(var i=registerCount-1; i>=0; i--) {
            var key = hll.util.getBitSequenceValueFromByteArray(bytes, bitOffset, log2m);
            bitOffset += log2m;
            var value = hll.util.getBitSequenceValueFromByteArray(bytes, bitOffset, registerWidth);
            bitOffset += registerWidth;

            registers[key] = value;
        }

        var hllSet = new hll.HLL(log2m, registerWidth);
            hllSet.registers = registers;
        return hllSet;
    }
})();
