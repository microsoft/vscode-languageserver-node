var path = require('path');
var fs = require('fs');

var source = path.resolve(process.argv[0]);

var file = path.basename(source);
var dest = path.join(path.resolve(process.argv[1]), file);

fs.writeFileSync(dest, fs.readFileSync(source));