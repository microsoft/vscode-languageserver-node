/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { CompilerOptions as TCompilerOptions } from '@typescript/native/unstable/sync';

type RCompilerOptions = Required<TCompilerOptions>;
type ScriptTarget = RCompilerOptions['target'];
type ModuleKind = RCompilerOptions['module'];
type JsxEmit = RCompilerOptions['jsx'];
type ModuleResolutionKind = RCompilerOptions['moduleResolution'];
type ModuleDetectionKind = RCompilerOptions['moduleDetection'];
type NewLineKind = RCompilerOptions['newLine'];
export const enum ImportsNotUsedAsValues {
	Remove,
	Preserve,
	Error,
}

type ConvertCompilerOptionsValue<T> =
	T extends ImportsNotUsedAsValues | JsxEmit | ModuleKind | ModuleResolutionKind | ModuleDetectionKind | NewLineKind | ScriptTarget
		? string
		: T;

type CompilerOptionsMap<T extends TCompilerOptions> = {
	[k in keyof T]: ConvertCompilerOptionsValue<T[k]>;
};

export type CompilerOptions = CompilerOptionsMap<TCompilerOptions>;

export namespace CompilerOptions {
	export function assign(opt1: CompilerOptions, opt2: CompilerOptions): CompilerOptions;
	export function assign(opt1: CompilerOptions, opt2: CompilerOptions | undefined): CompilerOptions;
	export function assign(opt1: CompilerOptions | undefined, opt2: CompilerOptions): CompilerOptions;
	export function assign(opt1: undefined, opt2: undefined): undefined;
	export function assign(opt1: CompilerOptions | undefined, opt2: CompilerOptions | undefined): CompilerOptions | undefined;
	export function assign(opt1: CompilerOptions | undefined, opt2: CompilerOptions | undefined): CompilerOptions | undefined {
		if (opt1 === undefined) {
			return opt2;
		}
		if (opt2 === undefined) {
			return opt1;
		}
		const result: CompilerOptions = Object.assign({}, opt1);
		const writableResult = result as Record<keyof CompilerOptions, CompilerOptions[keyof CompilerOptions]>;
		for (const prop of Object.keys(opt2) as (keyof CompilerOptions)[]) {
			const cv = writableResult[prop];
			const nv = opt2[prop];
			if (cv === undefined) {
				writableResult[prop] = nv;
			} else if (nv === undefined) {
				// Keep cv;
			} else if (cv !== undefined && nv !== undefined) {
				if (Array.isArray(cv) && Array.isArray(nv)) {
					writableResult[prop] = Arrays.assign(cv as [], nv as []);
				} else {
					writableResult[prop] = nv;
				}
			}
		}
		return result;
	}
}

export namespace Arrays {
	export function assign<T>(arr1: T[] | undefined, arr2:T[] | undefined): T[] | undefined {
		if (arr1 === undefined) {
			return arr2;
		}
		if (arr2 === undefined) {
			return arr1;
		}
		return Array.from(new Set<T>(arr2.concat(...arr1)));
	}
}

export type SharableOptions = {
	extends?: SharableOptions[];
	compilerOptions?: CompilerOptions;
	include?: string[];
	exclude?: string[];
	files?: string[];
};

export type SourceFolderDescription = {
	path: string;
	out?: {
		dir: string;
		buildInfoFile?: string;
	};
	references?: string[];
} & SharableOptions;

export type ProjectDescription = {
	name: string;
	path: string;
	out?: {
		dir: string;
		buildInfoFile?: string;
	};
	sourceFolders?: SourceFolderDescription[];
	references?: (ProjectDescription | string)[];
} & SharableOptions;

export type ProjectOptions = {
	tags: string[];
	tsconfig?: string;
	variables?: Map<string, string>;
	compilerOptions?: CompilerOptions;
};

export type ProjectEntry = [ ProjectDescription, ProjectOptions[] ];
export type Projects = ProjectEntry[];