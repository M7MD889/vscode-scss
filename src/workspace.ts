import StorageService from './services/storage';
import ScannerService from './services/scanner';
import SettingsService from './services/settings';

export type WorkspaceServices = {
	storage: StorageService;
	scanner: ScannerService;
	settings: SettingsService;
};

export default class Workspace {
	public get uri(): string {
		return this._uri;
	}

	public get services(): WorkspaceServices {
		return this._services;
	}
	constructor(private readonly _uri: string, private readonly _services: WorkspaceServices) {}

	public setSettings(settings: SettingsService): void {
		this._services.settings = settings;
	}
}
