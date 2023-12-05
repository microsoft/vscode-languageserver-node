/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
//@ts-check

const fs = require('fs');

const pkg = { type: 'module' };

fs.writeFileSync('lib/esm/package.json', JSON.stringify(pkg, undefined, 2) + '\n');
