js-hll
======

A JavaScript implementation of [HyperLogLog](http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf) whose goal is to be storage-compatible with other similar [offerings](https://github.com/aggregateknowledge/postgresql-hll) from [Aggregate Knowledge](http://blog.aggregateknowledge.com/). A [demo](http://www.aggregateknowledge.com/science/blog/venn.html) of this library is available.


Latest Version
---------------

*  [v1.0.0](js-hll-1.0.0.js)
*  [v1.0.0 (minified)](js-hll-1.0.0.min.js)


Overview
--------

HyperLogLog (HLL) is a fixed-size, set-like structure used for distinct value counting with tunable precision. For example, in 1280 bytes HLL can estimate the count of tens of billions of distinct values with only a few percent error.

*`log2m`*

The log-base-2 of the number of registers used in the HyperLogLog algorithm. It must be at least 4 and at most 24 (but it is recommended to be no more than 17). This parameter tunes the accuracy of the HyperLogLog structure. The relative error is given by the expression _&plusmn;1.04/&radic;(2^log2m)_. Note that increasing `log2m` by 1 doubles the required storage for the HLL.

*`registerWidth`*

The number of bits used per register in the HyperLogLog algorithm. It must be at least 1 and at most 5. This parameter, in conjunction with `log2m`, tunes the maximum cardinality of the set whose cardinality can be estimated. For clarity, a table of `registerWidth`s and `log2m`s, the approximate maximum cardinality and the size of the resulting structure that can be estimated with those parameters is provided below.


<table>
    <thead>
        <th><code>logm2</code></th><th><code>regwidth=1</code></th><th><code>regwidth=2</code></th><th><code>regwidth=3</code></th><th><code>regwidth=4</code></th><th><code>regwidth=5</code></th>
    </thead>
    <tbody>
<tr><td>10</td><td>7.4e+02 <em>(128B)</em></td><td>3.0e+03 <em>(256B)</em></td><td>4.7e+04 <em>(384B)</em></td><td>1.2e+07 <em>(512B)</em></td><td>7.9e+11 <em>(640B)</em></td></tr>
<tr><td>11</td><td>1.5e+03 <em>(256B)</em></td><td>5.9e+03 <em>(512B)</em></td><td>9.5e+04 <em>(768B)</em></td><td>2.4e+07 <em>(1.0KB)</em></td><td>1.6e+12 <em>(1.2KB)</em></td></tr>
<tr><td>12</td><td>3.0e+03 <em>(512B)</em></td><td>1.2e+04 <em>(1.0KB)</em></td><td>1.9e+05 <em>(1.5KB)</em></td><td>4.8e+07 <em>(2.0KB)</em></td><td>3.2e+12 <em>(2.5KB)</em></td></tr>
<tr><td>13</td><td>5.9e+03 <em>(1.0KB)</em></td><td>2.4e+04 <em>(2.0KB)</em></td><td>3.8e+05 <em>(3KB)</em></td><td>9.7e+07 <em>(4KB)</em></td><td>6.3e+12 <em>(5KB)</em></td></tr>
<tr><td>14</td><td>1.2e+04 <em>(2.0KB)</em></td><td>4.7e+04 <em>(4KB)</em></td><td>7.6e+05 <em>(6KB)</em></td><td>1.9e+08 <em>(8KB)</em></td><td>1.3e+13 <em>(10KB)</em></td></tr>
<tr><td>15</td><td>2.4e+04 <em>(4KB)</em></td><td>9.5e+04 <em>(8KB)</em></td><td>1.5e+06 <em>(12KB)</em></td><td>3.9e+08 <em>(16KB)</em></td><td>2.5e+13 <em>(20KB)</em></td></tr>
<tr><td>16</td><td>4.7e+04 <em>(8KB)</em></td><td>1.9e+05 <em>(16KB)</em></td><td>3.0e+06 <em>(24KB)</em></td><td>7.7e+08 <em>(32KB)</em></td><td>5.1e+13 <em>(40KB)</em></td></tr>
<tr><td>17</td><td>9.5e+04 <em>(16KB)</em></td><td>3.8e+05 <em>(32KB)</em></td><td>6.0e+06 <em>(48KB)</em></td><td>1.5e+09 <em>(64KB)</em></td><td>1.0e+14 <em>(80KB)</em></td></tr>
    </tbody>
</table>


The Importance of Hashing
=========================

In brief, it is absolutely crucial to hash inputs to an HLL. A close approximation of uniform randomness in the inputs ensures that the error guarantees laid out in the original paper hold. In fact, a [JavaScript implementation](https://github.com/aggregateknowledge/js-murmur3-128/) of MurmurHash 3 (128bit) was made available to facilitate this input requirement. We've empirically determined that MurmurHash 3 is an excellent and fast hash function to use in conjunction with `js-hll` module.

The seed to the hash call must remain constant for all inputs to a given HLL.  Similarly, if one plans to compute the union of two HLLs, the input values must have been hashed using the same seed.

For a good overview of the importance of hashing and hash functions when using probabilistic algorithms as well as an analysis of MurmurHash 3, refer to these blog posts:

* [K-Minimum Values: Sketching Error, Hash Functions, and You](http://blog.aggregateknowledge.com/2012/08/20/k-minimum-values-sketching-error-hash-functions-and-you/)
* [Choosing a Good Hash Function, Part 1](http://blog.aggregateknowledge.com/2011/12/05/choosing-a-good-hash-function-part-1/)
* [Choosing a Good Hash Function, Part 2](http://blog.aggregateknowledge.com/2011/12/29/choosing-a-good-hash-function-part-2/)
* [Choosing a Good Hash Function, Part 3](http://blog.aggregateknowledge.com/2012/02/02/choosing-a-good-hash-function-part-3/)


On Unions and Intersections
===========================

HLLs have the useful property that the union of any number of HLLs is equal to the HLL that would have been populated by playing back all inputs to those '_n_' HLLs into a single HLL. Colloquially, one can say that HLLs have "lossless" unions because the same cardinality error guarantees that apply to a single HLL apply to a union of HLLs. See the `union()` function.

Using the [inclusion-exclusion principle](http://en.wikipedia.org/wiki/Inclusion%E2%80%93exclusion_principle) and the `union()` function, one can also estimate the intersection of sets represented by HLLs. Note, however, that error is proportional to the union of the two HLLs, while the result can be significantly smaller than the union, leading to disproportionately large error relative to the actual intersection cardinality. For instance, if one HLL has a cardinality of 1 billion, while the other has a cardinality of 10 million, with an overlap of 5 million, the intersection cardinality can easily be dwarfed by even a 1% error estimate in the larger HLLs cardinality.

For more information on HLL intersections, see [this blog post](http://blog.aggregateknowledge.com/2012/12/17/hll-intersections-2/).



Usage
-----

Refer to the unit tests (`hll-test.js`) or [`USAGE.markdown`](USAGE.markdown) for many more usage examples.

Hashing and adding a value to a new HLL:

```javascript
var seed = 0x123456;
var rawKey = new ArrayBuffer(8);
var byteView = new Int8Array(rawKey);
    byteView[0] = 0xDE; byteView[1] = 0xAD; byteView[2] = 0xBE; byteView[3] = 0xEF;
    byteView[4] = 0xFE; byteView[5] = 0xED; byteView[6] = 0xFA; byteView[7] = 0xCE;
var hllSet = new hll.HLL(13/*log2m*/, 5/*registerWidth*/);
    hllSet.addRaw(murmur3.hash128(rawKey, seed));
```

Retrieving the cardinality of an HLL:

```javascript
console.log(hllSet.cardinality());
```

Unioning two HLLs together (and retrieving the resulting cardinality):

```javascript
var hllSet1 = new hll.HLL(13/*log2m*/, 5/*registerWidth*/),
    hllSet2 = new hll.HLL(13/*log2m*/, 5/*registerWidth*/);

// ... (add values to both sets) ...

hllSet1.union(hllSet2)/*modifies hllSet1 to contain the union*/;
console.log(hllSet1.cardinality());
```

Cloning an HLL:

```javascript
var hllSet1 = new hll.HLL(13/*log2m*/, 5/*registerWidth*/),
    hllSet2 = new hll.HLL(13/*log2m*/, 5/*registerWidth*/);

// ... (add values to both sets) ...

var hllUnion = hllSet1.clone();
hllUnion.union(hllSet2)/*modifies hllUnion to contain the union*/;
// both 'hllSet1' and 'hllSet2' are unmodified
console.log(hllUnion.cardinality());
```

Reading an HLL from its [hex](STORAGE.markdown) form (for example, retrieved from a [PostgreSQL](https://github.com/aggregateknowledge/postgresql-hll PostgreSQL database)):

```javascript
var hllSet = hll.fromHexString(hllHexString).hllSet;
console.log(hllSet.cardinality());
```

Writing an HLL to its [hex](STORAGE.markdown) form (for example, to be inserted into a [PostgreSQL](https://github.com/aggregateknowledge/postgresql-hll PostgreSQL database)):


```javascript
...
var hllHexString = hllSet.toHexString();
...
```

Projects using `js-hll`
-----------------------

*  [Venn Diagram](http://www.aggregateknowledge.com/science/blog/venn.html)

* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

Building
--------

*  Requires [Maven 2.0](http://maven.apache.org/)
*  `mvn clean package` in the base directory

   A `target` directory will be created (which is the combination of `src/main` and `src/test/`).

   Library files `js-hll-x.x.x.js` and `js-hll-x.x.x.min.js` will be created in the base directory.


Testing
-------
*  Build the library
*  Point a browser at:
   1. `qunit-test.html` to run the unit tests
   2. `stress-test.html` to run the performance tests (view browser console (ctrl-shift-c) for results)


Notes
-----

*  This implementation will read all of the various [`STORAGE.markdown`](STORAGE.markdown) formats but only writes to the `FULL` format. Also, the in-RAM storage is always `FULL`.
*  For this initial implementation, readability has been chosen over in-RAM size. Specifically, the register values (regardless of the register width) are stored as an array of numbers (each of which are 64bits) rather than bit-packing them to achieve minimum storage. This will be rectified in future versions.
*  The register width is limited to at most 5 bits to allow for using JavaScript's native bit operations (which support up to 32bits). If you have the need to support 6 bits of precision please let us know (file an issue)!

