import { TextDocument, Range, Position } from 'vscode-languageserver';
import { getSCSSLanguageService } from 'vscode-css-languageservice';

import { INode } from '../types/nodes';

const ls = getSCSSLanguageService();

ls.configure({
	validate: false
});

export type MakeDocumentOptions = {
	uri?: string;
	languageId?: string;
	version?: number;
};

export function makeDocument(lines: string | string[], options: MakeDocumentOptions = {}): TextDocument {
	return TextDocument.create(
		options.uri || 'index.scss',
		options.languageId || 'scss',
		options.version || 1,
		Array.isArray(lines) ? lines.join('\n') : lines
	);
}

export function makeAst(lines: string[]): INode {
	const document = makeDocument(lines);

	return ls.parseStylesheet(document) as INode;
}

export function makeSameLineRange(line: number = 1, start: number = 1, end: number = 1): Range {
	return Range.create(Position.create(line, start), Position.create(line, end));
}
