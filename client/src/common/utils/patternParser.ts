/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

enum NodeType {
	text = 'text',
	separator = 'separator',
	brace = 'brace',
	bracket = 'bracket',
	questionMark = 'questionMark',
	star = 'star',
	globStar = 'globStar',
	endOfAlternative = 'endOfAlternative'
}

interface TextNode {
	type: NodeType.text;
	value: string;
}

interface SeparatorNode {
	type: NodeType.separator;
}

interface QuestionMarkNode {
	type: NodeType.questionMark;
}

interface StarNode {
	type: NodeType.star;
}

interface GlobStarNode {
	type: NodeType.globStar;
}

interface BracketNode {
	type: NodeType.bracket;
	value: string;
}

interface BraceNode {
	type: NodeType.brace;
	alternatives: NodeList[];
}

interface EndOfAlternativeNode {
	type: NodeType.endOfAlternative;
}

type Node = TextNode | SeparatorNode | QuestionMarkNode | StarNode | GlobStarNode | BracketNode | BraceNode | EndOfAlternativeNode;

type NodeList = Node[];

function escapeRegExpCharacters(value: string): string {
	return value.replace(/[\\\{\}\*\+\?\|\^\$\.\[\]\(\)]/g, '\\$&');
}

class PatternParser {

	private value: string;
	private index: number;

	private mode: 'pattern' | 'brace';

	constructor(value: string, mode: 'pattern' | 'brace' = 'pattern') {
		this.value = value;
		this.index = 0;
		this.mode = mode;
	}

	private makeTextNode(start: number): Node {
		return { type: NodeType.text, value: escapeRegExpCharacters(this.value.substring(start, this.index)) };
	}

	private next(): Node | undefined {
		let start = this.index;
		let ch: string | undefined;
		while ((ch = this.value[this.index]) !== undefined) {
			switch (ch) {
				case '/':
					if (start < this.index) {
						return this.makeTextNode(start);
					} else {
						this.index++;
						return { type: NodeType.separator };
					}
				case '?':
					this.index++;
					return { type: NodeType.questionMark };
				case '*':
					if (this.value[this.index + 1] === '*') {
						this.index += 2;
						return { type: NodeType.globStar };
					} else {
						this.index++;
						return { type: NodeType.star };
					}
				case '{':
					if (start < this.index) {
						return this.makeTextNode(start);
					} else {
						const bracketParser = new PatternParser(this.value.substring(this.index + 1), 'brace');
						const alternatives: NodeList[] = [];
						let childPattern: NodeList | undefined;
						while ((childPattern = bracketParser.parse()) !== undefined) {
							alternatives.push(childPattern);
							// If the end of the pattern was the end of brace, stop
							// parsing.
							if (this.value[this.index + bracketParser.index] === '}') {
								break;
							}
						}
						this.index = this.index + bracketParser.index + 1;
						return { type: NodeType.brace, alternatives: alternatives };
					}
					break;
				case '}':
				case ',':
					if (this.mode === 'brace') {
						if (start < this.index) {
							let result = this.makeTextNode(start);
							this.index++;
							return result;
						} else {
							this.index++;
							return { type: NodeType.endOfAlternative };
						}
					}
					this.index++;
					break;
				case '[':
					const buffer: string[] = [];
					this.index++;
					const firstIndex = this.index;
					while (this.index < this.value.length) {
						const ch = this.value[this.index];
						if (this.index === firstIndex) {
							switch (ch) {
								case ']':
									buffer.push(ch);
									break;
								case '!':
								case '^':
									buffer.push('^');
									break;
								default:
									buffer.push(escapeRegExpCharacters(ch));
									break;
							}
						} else if (ch === '-') {
							buffer.push(ch);
						} else if (ch === ']') {
							this.index++;
							return { type: NodeType.bracket, value: buffer.join('') };
						} else {
							buffer.push(escapeRegExpCharacters(ch));
						}
						this.index++;
					}
					throw new Error(`Invalid glob pattern ${this.index}. Stopped at ${this.index}`);
				default:
					this.index++;
			}
		}
		return start === this.index ? undefined : this.makeTextNode(start);
	}

	public parse(): NodeList | undefined {
		const buffer: NodeList = [];
		let node: Node | undefined;
		while (true) {
			node = this.next();
			if (node === undefined || node.type === NodeType.endOfAlternative) {
				break;
			}
			buffer.push(node);
		}
		return buffer?.length || node?.type === NodeType.endOfAlternative ? buffer : undefined;
	}
}

function nodeList2RegExp(pattern: NodeList) {
	const separator = '\\/';
	const fileChar = `[^${separator}]`;
	function convertNode(node: Node): string {
		switch (node.type) {
			case NodeType.separator:
				return separator;
			case NodeType.text:
				return node.value;
			case NodeType.questionMark:
				return fileChar;
			case NodeType.star:
				return `${fileChar}+?`;
			case NodeType.globStar:
				return `.+?`;
			case NodeType.bracket:
				return `[${node.value}]`;
			case NodeType.brace: {
				let buffer: string[] = [];
				for (const child of node.alternatives) {
					const childRegex = nodeList2RegExp(child);
					buffer.push(childRegex ?? ''); // Include a blank for empty alternatives
				}
				return `(?:${buffer.join('|')})`;
			}
			default:
				throw `Unexpected node type: ${node.type}`;
		}
	}

	if (!pattern.length)
		return undefined;

	const buffer = pattern.map(convertNode);
	return buffer.join('');
}

/// Converts an LSP glob pattern to a regex.
///
/// Regex expects all paths are using forward slashes (eg. URI.path).
/// Invalid patterns will throw.
export function convert2RegExp(pattern: string): RegExp | undefined {
	const nodes = new PatternParser(pattern).parse();
	return nodes?.length ? new RegExp(`^${nodeList2RegExp(nodes)}$`) : undefined;
}
