'use strict';

import {
	createConnection,
	IPCMessageReader,
	IPCMessageWriter,
	TextDocuments,
	InitializeParams,
	InitializeResult,
	Files,
	DidChangeConfigurationNotification,
	SymbolInformation,
	TextDocumentPositionParams
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

function findFiles(cwd: string, settings: SettingsService): Promise<string[]> {
	return utils.fs.findFiles('**/*.scss', {
		cwd,
		deep: settings.scannerDepth,
		ignore: settings.scannerExclude
	});
}

async function getWorkspace(uri: string): Promise<Workspace> {
	const result = workspaces.get(uri);

	if (result !== undefined) {
		return result;
	}

	const options = await connection.workspace.getConfiguration({
		scopeUri: uri,
		section: 'scss'
	});

	const settings = new SettingsService(options);
	const storage = new StorageService();
	const scanner = new ScannerService(storage, settings);

	const workspace = new Workspace(uri, {
		settings,
		storage,
		scanner
	});

	workspaces.set(workspace.uri, workspace);

	const workspaceFsPath = Files.uriToFilePath(workspace.uri);

	try {
		const files = await findFiles(workspaceFsPath, workspace.services.settings);

		await workspace.services.scanner.scan(files);
	} catch (error) {
		if (workspace.services.settings.showErrors) {
			connection.window.showErrorMessage(error);
		}
	}

	return workspace;
}

function getRelatedWorkspaceUri(uri: string): string | null {
	for (const workspace of workspaces.values()) {
		if (uri.startsWith(workspace.uri)) {
			return workspace.uri;
		}
	}

	return null;
}

async function getActionContext(textDocumentPosition: TextDocumentPositionParams) {
	const documentUri = textDocumentPosition.textDocument.uri;
	const workspaceUri = getRelatedWorkspaceUri(documentUri);

	const document = documents.get(documentUri);
	const offset = document.offsetAt(textDocumentPosition.position);
	const workspace = await getWorkspace(workspaceUri);

	return {
		document,
		offset,
		workspace
	};
}

const connection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

const workspaces: Map<string, Workspace> = new Map();
const documents: TextDocuments = new TextDocuments();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

documents.listen(connection);

connection.onInitialize(
	async (params: InitializeParams): Promise<InitializeResult> => {
		if (params.capabilities.workspace === undefined) {
			throw new Error('Wow!');
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

connection.onInitialized(async () => {
	const workspaceFolders = await connection.workspace.getWorkspaceFolders();

	for (const workspaceFolder of workspaceFolders) {
		await getWorkspace(workspaceFolder.uri);
	}

	connection.client.register(DidChangeConfigurationNotification.type, undefined);
	connection.workspace.onDidChangeWorkspaceFolders(async event => {
		for (const workspaceFolder of event.added) {
			await getWorkspace(workspaceFolder.uri);
		}

		for (const workspaceFolder of event.removed) {
			workspaces.delete(workspaceFolder.uri);
		}
	});
});

connection.onDidChangeConfiguration(async () => {
	const workspaceFolders = [...workspaces.values()];

	for (const workspaceFolder of workspaceFolders) {
		workspaces.delete(workspaceFolder.uri);

		await getWorkspace(workspaceFolder.uri);
	}
});

connection.onDidChangeWatchedFiles(async event => {
	const tasks: Map<string, string[]> = new Map();

	for (const file of event.changes) {
		const workspaceUri = getRelatedWorkspaceUri(file.uri);

		if (workspaceUri === null) {
			continue;
		}

		const task = tasks.get(workspaceUri) || [];
		const fileFsPath = Files.uriToFilePath(file.uri);

		task.push(fileFsPath);

		tasks.set(workspaceUri, task);
	}

	for (const [workspaceUri, files] of tasks.entries()) {
		const workspace = await getWorkspace(workspaceUri);

		await workspace.services.scanner.scan(files);
	}
});

connection.onCompletion(async textDocumentPosition => {
	const { document, offset, workspace } = await getActionContext(textDocumentPosition);

	return doCompletion(document, offset, workspace.services.settings, workspace.services.storage);
});

connection.onHover(async textDocumentPosition => {
	const { document, offset, workspace } = await getActionContext(textDocumentPosition);

	return doHover(document, offset, workspace.services.storage);
});

connection.onSignatureHelp(async textDocumentPosition => {
	const { document, offset, workspace } = await getActionContext(textDocumentPosition);

	return doSignatureHelp(document, offset, workspace.services.storage);
});

connection.onDefinition(async textDocumentPosition => {
	const { document, offset, workspace } = await getActionContext(textDocumentPosition);

	return goDefinition(document, offset, workspace.services.storage);
});

connection.onWorkspaceSymbol(async workspaceSymbolParams => {
	const result: SymbolInformation[][] = [];

	for (const workspace of workspaces.values()) {
		const symbols = await searchWorkspaceSymbol(
			workspaceSymbolParams.query,
			workspace.services.storage,
			Files.uriToFilePath(workspace.uri)
		);

		result.push(symbols);
	}

	return utils.array.flatten(result);
});

connection.onShutdown(() => {
	for (const workspace of workspaces.values()) {
		workspace.services.storage.clear();
	}
});

connection.listen();
