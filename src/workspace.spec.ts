import * as assert from 'assert';

import * as sinon from 'sinon';

import Workspace, { WorkspaceServices } from './workspace';
import StorageService from './services/storage';
import SettingsService from './services/settings';
import ScannerService from './services/scanner';

function makeServices(): WorkspaceServices {
	const storage = new StorageService();
	const settings = new SettingsService();
	const scanner = sinon.createStubInstance(ScannerService) as unknown as ScannerService;

	return {
		storage,
		settings,
		scanner
	};
}

class WorkspaceTest extends Workspace {
	constructor(_uri: string) {
		super(_uri, makeServices());
	}
}

describe('Workspace', () => {
	describe('.uri', () => {
		it('should return uri', () => {
			const workspace = new WorkspaceTest('file:///usr/home');

			const expected = 'file:///usr/home';

			const actual = workspace.uri;

			assert.strictEqual(actual, expected);
		});
	});

	describe('.services', () => {
		it('should return services', () => {
			const workspace = new WorkspaceTest('file:///usr/home');

			const actual = workspace.services;

			assert.ok(actual.storage instanceof StorageService);
			assert.ok(actual.settings instanceof SettingsService);
			assert.ok(actual.scanner instanceof ScannerService);
		});
	});

	describe('.setSettings', () => {
		it('should set settings', () => {
			const workspace = new WorkspaceTest('file:///usr/home');
			const settings = new SettingsService({
				implicitlyLabel: null
			});

			workspace.setSettings(settings);

			const actual = workspace.services.settings;

			assert.strictEqual(actual.implicitlyLabel, null);
		});
	});
});
