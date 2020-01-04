import * as assert from 'assert';

import Settings from './settings';

describe('Settings', () => {
	it('should return instance with default values', () => {
		const settings = new Settings();

		assert.strictEqual(settings.scannerDepth, 30);
		assert.deepStrictEqual(settings.scannerExclude, [
			'**/.git',
			'**/node_modules',
			'**/bower_components'
		]);
		assert.ok(settings.scanImportedFiles);
		assert.strictEqual(settings.implicitlyLabel, '(implicitly)');
		assert.ok(!settings.showErrors);
		assert.ok(settings.suggestVariables);
		assert.ok(settings.suggestMixins);
		assert.ok(settings.suggestFunctions);
		assert.strictEqual(settings.suggestFunctionsInStringContextAfterSymbols, ' (+-*%');
	});

	it('should return instance with custom values', () => {
		const settings = new Settings({
			implicitlyLabel: null
		});

		assert.strictEqual(settings.implicitlyLabel, null);
	});
});
