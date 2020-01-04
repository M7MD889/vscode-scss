export type Options = {
	scannerDepth?: number;
	scannerExclude?: string[];
	scanImportedFiles?: boolean;
	implicitlyLabel?: string | null;
	showErrors?: boolean;
	suggestVariables?: boolean;
	suggestMixins?: boolean;
	suggestFunctions?: boolean;
	suggestFunctionsInStringContextAfterSymbols?: string;
};

export default class SettingsService {
	public readonly scannerDepth: number = this._getValue(this._options.scannerDepth, 30);
	public readonly scannerExclude: string[] = this._getValue(this._options.scannerExclude, [
		'**/.git',
		'**/node_modules',
		'**/bower_components'
	]);
	public readonly scanImportedFiles: boolean = this._getValue(this._options.scanImportedFiles, true);
	public readonly implicitlyLabel: string | null = this._getValue(this._options.implicitlyLabel, '(implicitly)');
	public readonly showErrors: boolean = this._getValue(this._options.showErrors, false);
	public readonly suggestVariables: boolean = this._getValue(this._options.suggestVariables, true);
	public readonly suggestMixins: boolean = this._getValue(this._options.suggestMixins, true);
	public readonly suggestFunctions: boolean = this._getValue(this._options.suggestFunctions, true);
	public readonly suggestFunctionsInStringContextAfterSymbols: string = this._getValue(
		this._options.suggestFunctionsInStringContextAfterSymbols,
		' (+-*%'
	);

	constructor(private readonly _options: Options = {}) {}

	private _getValue<T>(option: T | undefined, value: T): T {
		return option === undefined ? value : option;
	}
}
