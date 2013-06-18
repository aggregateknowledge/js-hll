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

// Unit tests for hll.js

// =============================================================================
test("hll.HLL", function() {
    // invalid 'log2m'
    try {
        new hll.HLL(3/*log2m (invalid)*/, 5/*registerWidth*/);
        ok(false, "Invalid log2m");
    } catch(error) {
        equal(error.message, "Register width must be between 4 and 24 inclusive (log2m = 3).");
    }
    try {
        new hll.HLL(25/*log2m (invalid)*/, 5/*registerWidth*/);
        ok(false, "Invalid log2m");
    } catch(error) {
        equal(error.message, "Register width must be between 4 and 24 inclusive (log2m = 25).");
    }

    // invalid 'registerWidth'
    try {
        new hll.HLL(10/*log2m*/, 0/*registerWidth (invalid)*/);
        ok(false, "Invalid log2m");
    } catch(error) {
        equal(error.message, "Register width must be between 1 and 5 inclusive (registerWidth = 0).");
    }
    try {
        new hll.HLL(10/*log2m*/, 6/*registerWidth (invalid)*/);
        ok(false, "Invalid log2m");
    } catch(error) {
        equal(error.message, "Register width must be between 1 and 5 inclusive (registerWidth = 6).");
    }
});

// =============================================================================
test("hll.HLL.addRaw", function() {
    // adding value to empty register
    (function() {
        var value = [ 0x89ABCD8F, 0x12345678 ];
        // 0xD8F = 0b 1101 1000 1111 (lower bits of 'value')
        // 0b---1 100- ----  =>  register value = lsb(1100) = 3
        // 0b---- ---0 1111  =>  register index = 15

        var hllSet = new hll.HLL(5/*registerCount = 2^5 = 32*/, 5/*registerWidth*/);
            hllSet.addRaw(value);
        var finalRegisters = [ 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,3,
                               0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0 ];
        deepEqual(hllSet.registers, finalRegisters, "Add to empty register");
    })();

    // adding value to already occupied register, with existing register larger
    // than added register value
    (function() {
        var registers = [ 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,2,
                          0,0,0,0, 0,0,0,0, 0,0,0,0, 4,3,2,1 ];
        var value = [ 0x89ABCD8F, 0x12345678 ];
        // 0xD8F = 0b 1101 1000 1111 (lower bits of 'value')
        // 0b---1 100- ----  =>  register value = lsb(1100) = 3
        // 0b---- ---0 1111  =>  register index = 15

        var hllSet = new hll.HLL(5/*registerCount = 2^5 = 32*/, 5/*registerWidth*/);
            hllSet.registers = registers;
            hllSet.addRaw(value);
        var finalRegisters = [ 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,3/*max(2,3)*/,
                               0,0,0,0, 0,0,0,0, 0,0,0,0, 4,3,2,1 ];
        deepEqual(hllSet.registers, finalRegisters, "Add to occupied register");
    })();

    // adding value larger than register width to registers
    (function() {
        var value = [ 0x8930000F, 0x01234567 ];
        // 0x--30 = 0b ---- ---- 0011 0000
        // 0x000F = 0b 0000 0000 0000 1111
        // 0b---- ---- 0011 0000
        // 0b0000 0000 000- ----  =>  register value = lsb(11000000000000000) = 16
        // 0b---- ---- ---0 1111  =>  register index = 15

        var hllSet = new hll.HLL(5/*registerCount = 2^5 = 32*/, 4/*registerWidth*/);
            hllSet.addRaw(value);
        var finalRegisters = [ 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,15/*min(2^4-1,16)*/,
                               0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0 ];
        deepEqual(hllSet.registers, finalRegisters, "Add register value greater than register width");
    })();
});

// =============================================================================
test("hll.HLL.cardinality", function() {
    // small range
    (function() {
        // one register set trivially fits the 'small range' since there are 
        // registers set to zero and the estimator is much less than 5m/2
        var hllSet = new hll.HLL(13/*registerCount (log2m)*/, 5/*registerWidth*/);
            hllSet.addRaw(longValue(13/*log2m*/, 0/*registerIndex*/, 1/*registerValue*/));
        equal(hllSet.algorithmCardinality(), 1.0000610401237584, "Small range cardinality");
        equal(hllSet.cardinality(), 2/*matches Java*/, "Small range cardinality");
    })();
    (function() {
        // all but one register set fits the 'small range' since there are registers 
        // set to zero and the estimator less than 5m/2
        var hllSet = new hll.HLL(13/*registerCount (log2m)*/, 5/*registerWidth*/);
        for(var i=(1<<13)/*log2m*/-2/*one zero register*/; i>=0; i--)
            hllSet.addRaw(longValue(13/*log2m*/, i/*registerIndex*/, 1/*registerValue*/));
        equal(hllSet.algorithmCardinality(), 73817.40214091193, "Small range cardinality");
        equal(hllSet.cardinality(), 73818/*matches Java*/, "Small range cardinality");
    })();

    // mid range
    (function() {
        // all registers set, estimator greater than 5m/2 but less than large range
        var hllSet = new hll.HLL(13/*registerCount (log2m)*/, 5/*registerWidth*/);
        for(var i=(1<<13)/*log2m*/-1; i>=0; i--)
            hllSet.addRaw(longValue(13/*log2m*/, i/*registerIndex*/, 7/*registerValue -- chosen to put estimator in range*/));
        equal(hllSet.algorithmCardinality(), 756238.261734032, "Mid range cardinality");
        equal(hllSet.cardinality(), 756239/*matches Java*/, "Mid range cardinality");
    })();

    // large range
    (function() {
        // all registers set, estimator greater than large range
        var hllSet = new hll.HLL(13/*registerCount (log2m)*/, 5/*registerWidth*/);
        for(var i=(1<<13)/*log2m*/-1; i>=0; i--)
            hllSet.addRaw(longValue(13/*log2m*/, i/*registerIndex*/, 30/*registerValue -- chosen to put estimator in range*/));
        equal(hllSet.algorithmCardinality(), 11235061032916.31, "Large range cardinality");
        equal(hllSet.cardinality(), 11235061032917/*matches Java*/, "Large range cardinality");
    })();
});

// =============================================================================
test("hll.HLL.union", function() {
    // union of two sets with different number of registers
    (function() {
        var hllSet1 = new hll.HLL(5/*registerCount*/, 5/*registerWidth*/);
        var hllSet2 = new hll.HLL(6/*registerCount*/, 5/*registerWidth*/);
        try {
            hllSet1.union(hllSet2);
            ok(false, "Cannot union sets with different register counts");
        } catch(error) {
            equal(error.message, "Union of sets with different 'log2m' (5 != 6) or 'registerWidth'.");
        }
    })();

    // union of two sets with different register width
    (function() {
        var hllSet1 = new hll.HLL(5/*registerCount*/, 4/*registerWidth*/);
        var hllSet2 = new hll.HLL(5/*registerCount*/, 5/*registerWidth*/);
        try {
            hllSet1.union(hllSet2);
            ok(false, "Cannot union sets with different register widths");
        } catch(error) {
            equal(error.message, "Union of sets with different 'log2m' or 'registerWidth' (4 != 5).");
        }
    })();

    // .........................................................................
    // union of two sets of the same number of registers
    (function() {
        var hllSet1 = new hll.HLL(5/*registerCount = 2^5 = 32*/, 5/*registerWidth*/);
            hllSet1.registers = [ 0,1,2,3, 1,2,3,4, 2,3,4,5, 3,4,5,6, 
                                  4,5,6,7, 5,6,7,8, 6,7,8,9, 7,8,9,0 ];
        var hllSet2 = new hll.HLL(5/*registerCount = 2^5 = 32*/, 5/*registerWidth*/);
            hllSet2.registers = [ 0,1,2,3, 4,5,6,7, 8,9,0,1, 2,3,4,5,
                                  6,7,8,9, 0,1,2,3, 4,5,6,7, 8,9,0,1 ];
        hllSet1.union(hllSet2);

        var hll1Registers = [ 0,1,2,3, 1,2,3,4, 2,3,4,5, 3,4,5,6, 
                              4,5,6,7, 5,6,7,8, 6,7,8,9, 7,8,9,0 ]/*unchanged*/,
            hll2Registers = [ 0,1,2,3, 4,5,6,7, 8,9,0,1, 2,3,4,5,
                              6,7,8,9, 0,1,2,3, 4,5,6,7, 8,9,0,1 ]/*unchanged*/,
            unionRegisters = [ 0,1,2,3, 4,5,6,7, 8,9,4,5, 3,4,5,6,
                               6,7,8,9, 5,6,7,8, 6,7,8,9, 8,9,9,1 ]/*union*/;
        notDeepEqual(hllSet1.registers, hll1Registers, "1st HLL changed by union");
        deepEqual(hllSet1.registers, unionRegisters, "Union with same number of registers");
        deepEqual(hllSet2.registers, hll2Registers, "2nd HLL left unchanged");
    })();
});

// =============================================================================
test("hll.HLL.clone", function() {
    (function() {
        var registers = [ 0,1,2,3, 1,2,3,4, 2,3,4,5, 3,4,5,6, 
                          4,5,6,7, 5,6,7,8, 6,7,8,9, 7,8,9,0 ];
        var hllSet = new hll.HLL(5/*registerCount = 2^5 = 32*/, 5/*registerWidth*/);
            hllSet.registers = registers;
        var clone = hllSet.clone();
        deepEqual(clone.registers, hllSet.registers, "Clone is copy of original");
    })();

    (function() {
        var hllSet = new hll.HLL(5/*registerCount = 2^5 = 32*/, 5/*registerWidth*/);
            hllSet.registers = [ 0,1,2,3, 1,2,3,4, 2,3,4,5, 3,4,5,6, 
                                 4,5,6,7, 5,6,7,8, 6,7,8,9, 7,8,9,0 ];
        var clone = hllSet.clone();
        deepEqual(clone.registers, hllSet.registers, "Clone is copy of original");

        // update the original set's registers to ensure that the clone's do 
        // not change
        hllSet.addRaw([ 0x89ABC00F, 0x01234567 ]/*register 15 => max(6,10) => 10*/);
        notDeepEqual(clone.registers, hllSet.registers, "Clone does not track the original set");
    })();
});

// -----------------------------------------------------------------------------
test("hll.HLL.clear", function() {
    (function() {
        var hllSet = new hll.HLL(5/*registerCount = 2^5 = 32*/, 5/*registerWidth*/);
            hllSet.registers = [ 1,2,3,4, 2,3,4,5, 3,4,5,6, 4,5,6,7,
                                 5,6,7,8, 6,7,8,9, 7,8,9,1, 8,9,1,2 ];
            hllSet.clear();
        var clearRegisters = [ 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 
                               0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0 ];
        deepEqual(hllSet.registers, clearRegisters, "Cleared registers");
    })();
});

// =============================================================================
test("hll.HLL.fold", function() {
    // fill 'n' HLLs each with a different log2m with the same random values.  
    // Fold the largest log2m HLL down and compare with each explicitly added HLL. 
    (function() {
        var MAX_INT = 1 << 31,
            MIN_LOG2M = 4/*by contract (inclusive)*/,
            MAX_LOG2M = 16/*sane upper bound (inclusive)*/,
            VALUES_TO_ADD = 1000 * 1000/*arbitrary but enough so that all registers get set*/;
        var hllSets = {}/*associative array*/;
        for(var log2m=MIN_LOG2M; log2m<=MAX_LOG2M; log2m++) hllSets["" + log2m] = new hll.HLL(log2m, 5/*registerWidth*/);

        // add the same random values to each HLL
        for(var i=0; i<VALUES_TO_ADD; i++) {
            var value = [ Math.floor(Math.random() * MAX_INT), Math.floor(Math.random() * MAX_INT)]; 
            for(var log2m=MIN_LOG2M; log2m<=MAX_LOG2M; log2m++) hllSets["" + log2m].addRaw(value);
        }

        // compare the folded registers with the registers of a set built at that log2m
        var largestLog2mHll = hllSets["" + MAX_LOG2M];
        for(var log2m=MIN_LOG2M; log2m<=MAX_LOG2M; log2m++) {
            var foldedHllSet = largestLog2mHll.fold(log2m);
            deepEqual(foldedHllSet.registers, hllSets["" + log2m].registers, "Folding " + MAX_LOG2M + " down to " + log2m + ".");
        }
    })();
});

// =============================================================================
test("hll.HLL.toHexString hll.fromHexString", function() {
    // schema v1 'FULL'
    // NOTE:  values taken from test_data_v1.csv *except* the 3rd byte is changed
    //        to "0x00" (since there's no explicit cutoff set in the JavaScript
    //        implementation) and the entire string is capitalized (for consistency)
    var hex = "/X14890059D274250852D084A547438EB4250941CE74210D625094216B525083A928428C93A5463AD0A499E94BCEA49D4B425285A10E4216932DAB32D08529293A1885210849D484A9C7621496A0EA41CE94258641D09329484A1074AD8B41D2B4A5083B54A4A16841948521693A12C61CE8329064B50932909429684A5494A10A4216749CEA4B169434EA51D0A4A12A4A10B4A9483A1484A4E8599693C54A4A5094A9883A12A629693A8E9525475A9473A0EC49D4843946520E8624E7421283A5074A5475254749D8942548321075212749D2742DAD52D0652508528E85250E49D29529295254849D8769D4B3A4EA3AD2742D0939D474BD2B41D2A39CEC424EA62D27518E8518E75B0E742D693A1086A12A620EB399285210841D283B16941D2742509324C74A50939CE74190B42188525075A1C94B0EB39CE8625274A18649CEA3A108";
    var registers = [ 11, 7, 9, 7, 8, 9, 8, 8,10,11, 8, 8, 9, 9,10, 7, 8,14, 7,11, 8, 9, 8, 9, 8, 7, 7, 7, 8, 8, 8,13,
                      12, 9, 8, 9, 8, 8,11,11,10, 9, 8, 8, 7,10, 9, 8, 8,10, 6, 9, 7, 9,10, 6, 7,11, 8,10, 9, 6,15, 9,
                       9,15, 7,10, 9, 7,10,11, 8, 9, 9, 8,11, 8, 8,14, 8, 8,11, 9, 6,11,13,11, 6,11, 8, 8,10,10, 9, 9,
                       7, 8,12, 8,10, 8, 8, 8, 9, 7,10, 8, 9,10,14, 7,12, 8,10, 9,13, 8, 7,10, 8, 7, 7, 9, 8, 9,12, 6,
                       8, 7, 8, 9, 6,10,10, 8, 9, 8, 8, 7, 9,11,12,11, 8, 7, 9,11, 9, 9, 8, 8, 7,13,10,10, 9, 8,11, 8,
                       8, 6,10, 8,10, 8,11, 9, 7, 8, 9,12,12, 7, 7, 8, 6,10, 8, 6, 9,13, 8, 9, 6,10, 8, 9, 8,10,11, 8,
                       9, 9,10, 9, 9, 8, 8,10, 8, 8,11, 7, 9, 7, 7,10, 9,12,11, 9, 8,13, 7,10,10, 7, 8,10, 9, 8, 9,10,
                       9, 8, 8,11, 9,10,10, 8, 7, 8,10, 8, 9, 9, 7, 8,11, 6,11, 9, 7,17,10,10, 9, 9, 8, 9, 9,10,12, 8,
                       7, 8, 9,10,12,10,11, 9, 7,10, 7, 9,10, 9,10, 7,11,10,10, 7, 7, 8, 7,12, 9, 7,10, 8, 8,14,10, 6,
                      10, 8, 7, 8,12, 9, 7, 7, 8, 8, 9, 8, 7, 9, 8, 7, 9, 9,10, 7,10, 9,10, 7, 9, 7,12, 9, 8, 9,10, 8,
                       6, 8, 8, 7,10, 8, 9, 7, 9, 7, 9, 7, 8,11,13,13,10,11, 8, 6,10, 9, 8, 8,10,10, 7, 8,10, 9, 8,14, 
                       9, 7, 9, 9,10,10, 9, 9,10, 9,10, 8, 9, 7,12, 7,13, 7,10,11, 7, 9, 7,10, 7,11, 9, 7, 8,11, 8, 9,
                       7, 7,10, 7, 9,15, 9,11, 8, 7, 9,10, 7, 7, 7,12, 8, 9, 7,10,12,11, 9, 7,10, 6, 7, 8,10, 6, 7, 7,
                      11,12, 7, 7, 8,11,11, 9, 7, 8, 8, 8,13, 8, 9,10,12, 8, 7,11, 7, 6, 9, 8,10, 8, 8, 8, 8, 7, 9, 8,
                       7,12,11, 9, 8, 7, 9, 7, 8, 9, 8, 9, 6, 9, 6, 7, 9, 9, 8, 9, 7, 7, 7, 7, 8, 6, 8,11, 8, 8,12, 8,
                      10, 9, 8, 7,11, 8,14, 9, 9,12, 7,11, 7, 7, 7, 8,12, 9, 9, 7, 9, 8,12, 6, 9, 7, 7,10, 7, 8, 8, 8 ];
    var cardinality = 98656;

    // from hex
    (function() {
        var result = new hll.fromHexString(hex);
        equal(result.version, 1, "Schema version");
        equal(result.algorithm, "Full", "Algorithm");

        var hllSet = result.hllSet/*for convenience*/;
        equal(hllSet.log2m, 9, "log2m");
        equal(hllSet.registerWidth, 5, "Register width");
        deepEqual(hllSet.registers, registers);
        equal(hllSet.cardinality(), cardinality, "Cardinality");
        equal(hllSet.toHexString().toUpperCase(), hex, "Hex string");
    })();

    // to hex
    (function() {
        var hllSet = new hll.HLL(9/*registerCount (log2m)*/, 5/*registerWidth*/);
        for(var i=(1<<9)-1; i>=0; i--) hllSet.registers[i] = registers[i];
        equal(hllSet.cardinality(), cardinality, "Cardinality");
        equal(hllSet.toHexString().toUpperCase(), hex, "Hex string");
    })();
});

test("hll.fromHexString", function() {
    // schema v1 'FULL'
    // NOTE:  taken from line 4098 of https://github.com/aggregateknowledge/postgresql-hll/blob/master/testdata/cumulative_add_cardinality_correction.csv
    //        (There was a bug in HLL.cardinality() triggered by this case.
    //         Specifically (1 << 31) results in a signed value which isn't 
    //         desired so it must be coerced into unsigned. (See hll.addRaw())
    var hex = "\\x148B48F9CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE739CE7";
    var rawValue = parseLong("2199023255552");
        // 0x0200 00000000 => register index 0, register value 30
        deepEqual(rawValue, [0, 512], "Raw value (0x0200 00000000)");
    var cardinality = 189077.22232916445;

    // from hex
    (function() {
        var result = new hll.fromHexString(hex);
        equal(result.version, 1, "Schema version");
        equal(result.algorithm, "Full", "Algorithm");

        var hllSet = result.hllSet/*for convenience*/;
            hllSet.addRaw(rawValue);
        equal(hllSet.log2m, 11, "log2m");
        equal(hllSet.registerWidth, 5, "Register width");
        equal(hllSet.algorithmCardinality(), cardinality, "Cardinality");
    })();
});

// =============================================================================
asyncTest("Schema v1 test data", function() {
    d3.text("data/test_data_v1.csv", function(error, text) {
        start()/*allow qunit to continue*/;
        if(error) { ok(false/*failed*/, error); return/*nothing else to do*/; }

        assertParsedHLLWithRegisterData(text, 1/*schemaVersion*/);
    });
});

// .............................................................................
// Parses test data in the following format (delimited by pipes '|'):
//   1.  HLL hex string
//   2.  Array of HLL register values
//   3.  HLL Cardinality
// and asserts that the register values and cardinality match exactly.
//
// @param {Number} version the expected test data schema version 
function assertParsedHLLWithRegisterData(text, version) {
    var psv = text.split("\n");
        psv = psv.map(function(line) { return line.split("|"); });
    for(var lineIndex=1/*skip the file header*/; lineIndex<psv.length; lineIndex++) {
        var lineNumber = lineIndex + 1/*since want 1-based -- for convenience*/;
        var columns = psv[lineIndex];

        // disregard any lines with incorrect numbers of elements
        if(columns.length != 3) {
            ok(false, "Warning: expected 3 columns, found: " + line.length + " on line " + lineNumber + ".");
            continue/*disregard*/;
        } /* else -- there are exactly three columns as expected */

        try {
            var hexString = columns[0/*hex encoded HLL*/],
                registers = JSON.parse(columns[1/*registers as a JSON array*/]),
                cardinality = parseInt(columns[2/*HLL cardinality*/]);
            var parsedResult = hll.fromHexString(hexString);
            equal(parsedResult.version, version, "Schema version " + version + " on line " + lineNumber);
            var hllSet = parsedResult.hllSet/*for convenience*/;
        } catch(error) {
            ok(false, error.message);
            continue/*don't continue with this line*/;
        }

        // only 'SPARSE' and 'FULL' have meaningful register values
        // (for 'EXPLICIT' the "register values" are actually the explicit set
        // values which are converted into register values)
        if((parsedResult.algorithm == hll.algorithm.SPARSE) || (parsedResult.algorithm == hll.algorithm.FULL)) {
            var m = 1 << hllSet.log2m/*2^log2m*/;
            ok(registers.length >= m, "Register length for data on line " + lineNumber);
            if(registers.length != m) console.log("Warn: unexpected register length (" + registers.length + " != " + m + ") on line " + lineNumber + ".")/*data bug*/;
            registers = registers.slice(0, m)/*for sanity and for deepEqual()*/;
            deepEqual(hllSet.registers, registers, "HLL registers for data on line " + lineNumber);

            // NOTE:  the cardinality in the test data for 'EXPLICIT' is always
            //        exact by definition. Since this implementation takes that
            //        explicit data and puts it into the HLL structure, the
            //        cardinality may not match.
            equal(hllSet.cardinality(), cardinality, "HLL cardinality for data on line " + lineNumber);
        } /* else -- not 'SPARSE' or 'FULL' */
    }
}

// -----------------------------------------------------------------------------
// HLL.addRaw()

asyncTest("cumulative_add_cardinality_correction.csv", function() {
    d3.text("data/cumulative_add_cardinality_correction.csv", function(error, text) {
        start()/*allow qunit to continue*/;
        if(error) { ok(false/*failed*/, error); return/*nothing else to do*/; }

        assertCumulativeAddData(text, 1/*schemaVersion*/, hll.algorithm.FULL);
    });
});

// TODO: once all of the algos and promotion are natively implemented then test
//       https://github.com/aggregateknowledge/postgresql-hll/blob/master/testdata/cumulative_add_comprehensive_promotion.csv

asyncTest("cumulative_add_sparse_edge.csv", function() {
    d3.text("data/cumulative_add_sparse_edge.csv", function(error, text) {
        start()/*allow qunit to continue*/;
        if(error) { ok(false/*failed*/, error); return/*nothing else to do*/; }

        // NOTE:  the data contains both 'SPARSE' and 'FULL'
        assertCumulativeAddData(text, 1/*schemaVersion*/);        
    });
});

asyncTest("cumulative_add_sparse_random.csv", function() {
    d3.text("data/cumulative_add_sparse_random.csv", function(error, text) {
        start()/*allow qunit to continue*/;
        if(error) { ok(false/*failed*/, error); return/*nothing else to do*/; }

        assertCumulativeAddData(text, 1/*schemaVersion*/, hll.algorithm.SPARSE);       
    });
});

asyncTest("cumulative_add_sparse_step.csv", function() {
    d3.text("data/cumulative_add_sparse_step.csv", function(error, text) {
        start()/*allow qunit to continue*/;
        if(error) { ok(false/*failed*/, error); return/*nothing else to do*/; }

        assertCumulativeAddData(text, 1/*schemaVersion*/, hll.algorithm.SPARSE);       
    });
});

// .............................................................................
// Parses test data in the following format (delimited by ','):
//   1.  HLL cardinality
//   2.  Raw value (long) to be added to the set
//   3.  HLL hex string (after raw value added)
// and asserts that the schema version and algorithm and cardinality match exactly.
//
// @param {Number} version the expected test data schema version 
// @param {String} [algorithm] the expected test data algorithm 
function assertCumulativeAddData(text, version, algorithm) {
    var hllSet = null/*set on 1st line*/;

    var csv = text.split("\n");
        csv = csv.map(function(line) { return line.split(","); });
    for(var lineIndex=1/*skip the file header*/; lineIndex<csv.length; lineIndex++) {
        var lineNumber = lineIndex + 1/*since want 1-based -- for convenience*/;
        var line = csv[lineIndex];
        if(line.length != 3) {
            console.log("Warning: expected 3 columns, found: " + line.length + " on line " + lineNumber + ".")/*most files have blank lines at the bottom*/;
            continue/*disregard*/;
        } /* else -- there are exactly three columns as expected */

        try {
            var cardinality = parseFloat(line[0/*cardinality*/]),
                rawValue = parseLong(line[1/*raw value*/]),
                hexString = line[2/*hex encoded HLL*/];
            var parsedResult = hll.fromHexString(hexString);
            equal(parsedResult.version, version, "Schema version " + version + " on line " + lineNumber);
            if(algorithm) equal(parsedResult.algorithm, algorithm, "Schema algorithm '" + algorithm + "' on line " + lineNumber);
        } catch(error) {
            ok(false, error.message);
            continue/*don't continue with this line*/;
        }

        // NOTE:  the first line defines the empty set that all other lines
        //        are accumulated to.  
        if(lineIndex == 1) hllSet = parsedResult.hllSet;

        // add the raw value to the set and validate its cardinality
        // NOTE:  there's a NaN case in the test data which must be dealt with 
        //        explicitly (as it will show up as a negative cardinality)
        hllSet.addRaw(rawValue);
        var resultCardinality = hllSet.algorithmCardinality();
            resultCardinality = (resultCardinality < 0 ? Number.NaN : resultCardinality);
        deepEqual(resultCardinality, cardinality, "Cumulative cardinality on line " + lineNumber)/*deepEqual() to handle NaN case*/;
    }
}

// -----------------------------------------------------------------------------
asyncTest("cumulative_union_comprehensive.csv", function() {
    d3.text("data/cumulative_union_comprehensive.csv", function(error, text) {
        start()/*allow qunit to continue*/;
        if(error) { ok(false/*failed*/, error); return/*nothing else to do*/; }

        assertCumulativeUnionData(text, 1/*schemaVersion*/);        
    });
});

// .............................................................................
// Parses test data in the following format (delimited by ','):
//   1.  HLL cardinality
//   2.  HLL hex string of first set
//   3.  HLL cardinality of unioned sets
//   4.  HLL hex string of unioned sets
// and asserts that the schema version matches. Each pair of lines ([1,2], [2,3],
// ...) are unioned together and their results compared with the actual values.
// The cumulative unions (of both sets) are maintained and their cardinality
// compared with each other.
//
// @param {Number} version the expected test data schema version
function assertCumulativeUnionData(text, version) {
    var previousHllUnionSet = null/*the previous set*/,
        cumulativeHllSet = null/*starts with the first line*/,
        cumulativeHllUnionSet = null/*ditto*/;

    var csv = text.split("\n");
        csv = csv.map(function(line) { return line.split(","); });
    for(var lineIndex=1/*skip the file header*/; lineIndex<csv.length; lineIndex++) {
        var lineNumber = lineIndex + 1/*since want 1-based -- for convenience*/;
        var line = csv[lineIndex];
        if(line.length != 4) {
            console.log("Warning: expected 4 columns, found: " + line.length + " on line " + lineNumber + ".")/*most files have blank lines at the bottom*/;
            continue/*disregard*/;
        } /* else -- there are exactly three columns as expected */

        try {
            var cardinality = parseFloat(line[0/*cardinality*/]),
                hexString = line[1/*hex encoded HLL*/],
                unionCardinality = parseFloat(line[2/*union cardinality*/]),
                unionHexString = line[3/*union hex encoded HLL*/];
            var parsedResult = hll.fromHexString(hexString),
                parsedUnionResult = hll.fromHexString(unionHexString);
            equal(parsedResult.version, version, "Schema version " + version + " on line " + lineNumber);
            equal(parsedUnionResult.version, version, "Schema version " + version + " on line " + lineNumber);
            var hllSet = parsedResult.hllSet,
                hllUnionSet = parsedUnionResult.hllSet;
        } catch(error) {
            ok(false, error.message);
            continue/*don't continue with this line*/;
        }

        // validate that the sets and their expected cardinalities match
        // NOTE:  because there isn't native support for 'EXPLICIT' sets, the
        //        cardinality will never match in those cases -- exclude them
        if(parsedResult.algorithm != hll.algorithm.EXPLICIT) equal(hllSet.algorithmCardinality(), cardinality, "Cardinality on line " + lineNumber);
        if(parsedUnionResult.algorithm != hll.algorithm.EXPLICIT) equal(hllUnionSet.algorithmCardinality(), unionCardinality, "Union cardinality on line " + lineNumber);

        // NOTE:  the first line doesn't have a pair to match with
        if(lineIndex == 1) { 
            previousHllUnionSet = hllUnionSet;
            cumulativeHllSet = hllSet.clone()/*clone since it will be modified*/;
            cumulativeHllUnionSet = hllUnionSet.clone()/*ditto*/;

            continue/*move to next line*/; 
        } /* else -- not the 1st data line */

        // pair-wise union the two lines and test that it matches the expected
        // union cardinality
        // NOTE:  don't modify 'hllSet' or 'hllUnionSet' since it is needed for  
        //        pairing with the next line. 'previousHllSet' will not be used 
        //        after this line so it is OK to modify it.
        previousHllUnionSet.union(hllSet);
        equal(previousHllUnionSet.algorithmCardinality(), unionCardinality, "Pair-wise union cardinality on line " + lineNumber);

        previousHllUnionSet = hllUnionSet/*for next line to pair with*/;
        cumulativeHllSet.union(hllSet);
        cumulativeHllUnionSet.union(hllUnionSet);
    }

    equal(cumulativeHllSet.algorithmCardinality(), cumulativeHllUnionSet.algorithmCardinality(), "Cumulative unions");
}

// *****************************************************************************
/**
 * @param {String} string the string that is to be parsed into a 'long'. This
 *        cannot be null or empty.
 * @returns {Array|NaN} a two element array that contains the upper- (index 1)  
 *          and lower-32bit (index 0) bit values of the parsed 'long' (64bit) value
 */
function parseLong(string) {
    if(string == "NaN") return Number.NaN/*for sanity*/;
    var value = goog.math.Long.fromString(string)/*used for convenience*/;
    return [ value.getLowBits(), value.getHighBits() ];
}

// -----------------------------------------------------------------------------
/**
 * Creates a "long" value that would set the specified register to the specified
 * value.
 * 
 * @param {Number} log2m the log-base-2 of the number of registers
 * @param {Number} registerIndex the 0-based index of the register whose value 
 *        is to be set. This must be less than 2<sup>log2m</sup>.
 * @param {Number} registerValue the value to which the register is set to. 
 *        (This must be in bounds for the associated register width.)
 */
function longValue(log2m, registerIndex, registerValue) {
    var lsb = registerValue - 1/*since algo adds 1*/ + log2m/*offset by register index*/;  
    return [ ((lsb < 32) ? (1 << lsb) : 0) | registerIndex, 
             ((lsb >= 32) ? (1 << (lsb - 32)) : 0) ];
}