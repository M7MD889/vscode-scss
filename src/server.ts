'use strict';

import {
	createConnection,
	IConnection,
	IPCMessageReader,
	IPCMessageWriter,
	TextDocuments,
	InitializeParams,
	InitializeResult,
	Files
} from 'vscode-languageserver';

import ScannerService from './services/scanner';
import StorageService from './services/storage';
import SettingsService from './services/settings';

import { doCompletion } from './providers/completion';
import { doHover } from './providers/hover';
import { doSignatureHelp } from './providers/signatureHelp';
import { goDefinition } from './providers/goDefinition';
import { searchWorkspaceSymbol } from './providers/workspaceSymbol';
import Workspace from './workspace';
import * as utils from './utils';

let workspace: Workspace;

function findFiles(cwd: string, settings: SettingsService): Promise<string[]> {
	return utils.fs.findFiles('**/*.scss', {
		cwd,
		deep: settings.scannerDepth,
		ignore: settings.scannerExclude
	});
}

// Create a connection for the server
const connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

// Create a simple text document manager. The text document manager
// _supports full document sync only
const documents: TextDocuments = new TextDocuments();

// Make the text document manager listen on the connection
// _for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The server receives
// _in the passed params the rootPath of the workspace plus the client capabilites
connection.onInitialize(
	async (params: InitializeParams): Promise<InitializeResult> => {
		const settings = new SettingsService(params.initializationOptions.settings);
		const storage = new StorageService();
		const scanner = new ScannerService(storage, settings);

		workspace = new Workspace(params.rootUri, {
			settings,
			storage,
			scanner
		});

		const workspaceFsPath = Files.uriToFilePath(workspace.uri);

		try {
			const files = await findFiles(workspaceFsPath, workspace.services.settings);

			await workspace.services.scanner.scan(files);
		} catch (error) {
			if (workspace.services.settings.showErrors) {
				connection.window.showErrorMessage(error);
			}
		}

		return {
			capabilities: {
				textDocumentSync: documents.syncKind,
				completionProvider: { resolveProvider: false },
				signatureHelpProvider: {
					triggerCharacters: ['(', ',', ';']
				},
				hoverProvider: true,
				definitionProvider: true,
				workspaceSymbolProvider: true
			}
		};
	}
);

connection.onDidChangeConfiguration(params => {
	const settings = new SettingsService(params.settings.scss);

	workspace.setSettings(settings);
});

connection.onDidChangeWatchedFiles(event => {
	const files = event.changes.map(file => Files.uriToFilePath(file.uri));

	return workspace.services.scanner.scan(files);
});

connection.onCompletion(textDocumentPosition => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	const offset = document.offsetAt(textDocumentPosition.position);
	return doCompletion(document, offset, workspace.services.settings, workspace.services.storage);
});

connection.onHover(textDocumentPosition => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	const offset = document.offsetAt(textDocumentPosition.position);
	return doHover(document, offset, workspace.services.storage);
});

connection.onSignatureHelp(textDocumentPosition => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	const offset = document.offsetAt(textDocumentPosition.position);
	return doSignatureHelp(document, offset, workspace.services.storage);
});

connection.onDefinition(textDocumentPosition => {
	const document = documents.get(textDocumentPosition.textDocument.uri);
	const offset = document.offsetAt(textDocumentPosition.position);
	return goDefinition(document, offset, workspace.services.storage);
});

connection.onWorkspaceSymbol(workspaceSymbolParams => {
	return searchWorkspaceSymbol(
		workspaceSymbolParams.query,
		workspace.services.storage,
		Files.uriToFilePath(workspace.uri)
	);
});

connection.onShutdown(() => {
	workspace.services.storage.clear();
});

connection.listen();
