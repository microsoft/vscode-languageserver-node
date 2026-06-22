import * as path from 'path';
import { fileURLToPath } from 'url';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(_testsRoot: string, cb: (error: any, failures?: number) => void): void {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const root = path.dirname(fileURLToPath(import.meta.url));

	glob('**/**.test.js', { cwd: root }).then(async (files) => {
		// Add files to the test suite
		files.forEach(f => mocha.addFile(path.resolve(root, f)));

		try {
			// Load ESM test files before running
			await mocha.loadFilesAsync();
			// Run the mocha test
			mocha
				.run(failures => {
					cb(null, failures);
				});

		} catch (err) {
			cb(err);
		}
	}, (err) => {
		if (err) {
			return cb(err);
		}

	});
}