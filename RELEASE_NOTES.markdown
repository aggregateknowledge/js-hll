Release Notes
=============

*  v1.0.0 (6/18/2013):  Initial release
   *  Reads all schema v1 formats (converting them all to `FULL`)
   *  Writes schema v1 `FULL` (the cutoff byte is _always_ set to `0`)
   *  Stored in-RAM as an array of `Number`s (i.e. register values are _not_ bit packed in RAM)
   *  Supports `clone()`, `union()` and `fold()`



