#Overview

This JavaScript library was created in order to provide a method for creating 
and interacting with HyperLogLog data structures in JavaScript. HyperLogLog is 
a fixed-size, set-like structure used for distinct value counting with tunable 
precision. For example, in 1280 bytes HLL can estimate the count of tens of billions 
of distinct values with only a few percent error.

#Usage

##Basics

```javascript
var hashedValue = [ 0xCDCDCDCD, 0xABABABAB ];

// create a new empty HLL data structure
var hllSet = new hll.HLL(7/*log2m*/, 5/*registerWidth*/);

// add a hashed value to the structure
hllSet.addRaw(hashedValue);

// estimate the cardinality of the set
var cardinality = hllSet.cardinality();

// estimate the standard error of the cardinality estimation of the set
var standardError = hllSet.cardinalityError() * cardinality;

// clear the set's data
hllSet.clear();
```

##Hashing with Murmur3

```javascript
// seed and input data
var seed = 0x123456;
var rawKey = new ArrayBuffer(8);
var byteView = new Int8Array(rawKey);
    byteView[0] = 0xDE; byteView[1] = 0xAD; byteView[2] = 0xBE; byteView[3] = 0xEF;
    byteView[4] = 0xFE; byteView[5] = 0xED; byteView[6] = 0xFA; byteView[7] = 0xCE;

// create a new empty HLL data structure, hash the raw key and add it to the set
var hllSet = new hll.HLL(13/*log2m*/, 5/*registerWidth*/);
    hllSet.addRaw(murmur3.hash128(rawKey, seed));

// estimate the cardinality of the set
var cardinality = hllSet.cardinality();
```

##State

```javascript
// bare registers, `log2m`, and `registerWidth` state of hllStructure. These
// should not be directly set in virtually all circumstances but are made
// available for extension
var log2m = hllSet.log2m,
    registerWidth = hllSet.registerWidth,
    registers = hllSet.registers;
```

##Cloning and Folding

```javascript
// make a copy of an HLL structure
var cloneHLLSet = hllSet.clone();

// 'fold' an HLL structure down to a smaller `log2m` that is identical to the
// state had the HLL been created at that `log2m`. This will reduce the precision 
// and required storage of the set. The new value of `log2m` must be less than 
// or equal to the current value
var foldedHLLSet = hllSet.fold(5/*log2m*/);
```

##Encoding and Decoding from Strings

```javascript
// create new HLL structure encoded as hex string
// load string from from wherever you wish,
// strings must be encoded in the format specified in STORAGE.markdown
// working strings for testing may be found in test/data
var hllSet = hll.fromHexString(hllHexString).hllSet;

// encode an hll structure, all sets will be encoded in the "schema 1, FULL" 
// specification described in STORAGE.markdown
var encodedString = hllSet.toHexString();
```

##Union

```javascript
var hllSetAlpha = hll.fromHexString(alphaSetString).hllSet,
    hllSetBeta = hll.fromHexString(betSetString).hllSet;

// create a union of two sets and find its cardinality
// NOTE:  a 'clone()' is made so that the original two sets are left untouched
var unionSet = hllSetAlpha.clone();
    unionSet.union(hllSetBeta);

// find the cardinality and standard error of the union of structures
var unionCardinality = unionSet.cardinality();
var unionCardinalityError = unionSet.cardinalityError();
```

##Intersection

```javascript
var hllSetAlpha = hll.fromHexString(alphaSetString).hllSet,
    hllSetBeta = hll.fromHexString(betSetString).hllSet;

// find the cardinality of the intersection of two sets
// Use the Inclusion-Exclusion Principle: |A n B| = |A| + |B| - |A u B|
var cardinalityAlpha = hllSetAlpha.cardinality(),
    cardinalityBeta = hllSetBeta.cardinality();

var unionSet = hllSetAlpha.clone();
    unionSet.union(hllSetBeta);
var unionCardinality = unionSet.cardinality();

var intersectionCardinality = cardinalityAlpha + cardinalityBeta - unionCardiniality;

// the error of the cardinality estimation for an intersection is the error of
// the union of sets
var intersectionCardinalityError = unionSet.cardinalityError();
```
