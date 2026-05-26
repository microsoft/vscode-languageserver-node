/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

/*
 * Verifies that every dependency / devDependency in a package.json can be
 * resolved from the Azure Artifacts feed:
 *   https://dev.azure.com/monacotools/Monaco/_artifacts/feed/vscode
 *
 * Usage:
 *   node --enable-source-maps ./out/check-feed-availability.js <path/to/package.json>
 *   ts-node ./scripts/check-feed-availability.ts <path/to/package.json>
 *
 * Authentication:
 *   Uses interactive browser-based sign-in via @azure/identity. The first run
 *   opens a browser tab where you sign in with your Azure DevOps account; the
 *   resulting token is cached on disk so subsequent runs are silent until the
 *   refresh token expires.
 *
 *   No PAT is required.
 *
 * Requires:  npm i -D semver @types/semver @azure/identity
 *            Node 18+ (uses the global fetch API).
 */

import { readFile } from 'node:fs/promises';
import { argv, exit, stdout } from 'node:process';
import * as semver from 'semver';
import {
	InteractiveBrowserCredential,
	useIdentityPlugin,
	type AccessToken,
	type TokenCredential
} from '@azure/identity';
import { cachePersistencePlugin } from '@azure/identity-cache-persistence';

const FEED_ORG = 'monacotools';
const FEED_PROJECT = 'Monaco';
const FEED_NAME = 'vscode';
const FEED_REGISTRY = `https://pkgs.dev.azure.com/${FEED_ORG}/${FEED_PROJECT}/_packaging/${FEED_NAME}/npm/registry`;

// Azure DevOps resource ID. The "/.default" scope asks for the user's full set
// of granted permissions, which includes Packaging (Read) when signed in as a
// user with feed access.
const AZURE_DEVOPS_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/.default';

// First-party public client id that ships with the Azure CLI. Using it lets
// the interactive flow work out of the box without registering a custom app.
const AZURE_CLI_CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';

interface PackageJson {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

interface NpmPackument {
	name: string;
	versions?: Record<string, unknown>;
	'dist-tags'?: Record<string, string>;
}

type Result =
	| { kind: 'ok'; name: string; range: string; resolved: string; exact: boolean }
	| { kind: 'no-match'; name: string; range: string; available: string[] }
	| { kind: 'not-found'; name: string; range: string }
	| { kind: 'error'; name: string; range: string; message: string };

function getAuthHeader(token: string): string {
	return `Bearer ${token}`;
}

function createCredential(): TokenCredential {
	// Enable on-disk token cache so the interactive prompt only appears the
	// first time. The plugin is loaded lazily; if it isn't installed we fall
	// back to an in-memory cache for the current process.
	try {
		useIdentityPlugin(cachePersistencePlugin);
	} catch {
		// Plugin already registered or persistence unavailable -- non-fatal.
	}

	return new InteractiveBrowserCredential({
		clientId: AZURE_CLI_CLIENT_ID,
		// "organizations" allows any work/school account; switch to a specific
		// tenant id if your org enforces tenant-restricted sign-in.
		tenantId: 'organizations',
		tokenCachePersistenceOptions: {
			enabled: true,
			name: 'vscode-feed-availability'
		}
	});
}

async function acquireToken(credential: TokenCredential): Promise<AccessToken> {
	const token = await credential.getToken(AZURE_DEVOPS_SCOPE);
	if (!token) {
		throw new Error('failed to acquire an Azure DevOps access token');
	}
	return token;
}

function packageUrl(name: string): string {
	// Scoped packages keep the '@' and '/' un-encoded for npm-style registries.
	if (name.startsWith('@')) {
		const [scope, pkg] = name.split('/', 2);
		return `${FEED_REGISTRY}/${scope}/${encodeURIComponent(pkg)}`;
	}
	return `${FEED_REGISTRY}/${encodeURIComponent(name)}`;
}

async function fetchPackument(name: string, authHeader: string): Promise<NpmPackument | undefined> {
	const headers: Record<string, string> = {
		Accept: 'application/json',
		Authorization: authHeader
	};
	const res = await fetch(packageUrl(name), { headers });
	if (res.status === 404) {
		return undefined;
	}
	if (res.status === 401 || res.status === 403) {
		throw new Error(`auth failed (HTTP ${res.status}); the signed-in account may not have access to the '${FEED_NAME}' feed`);
	}
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} ${res.statusText}`);
	}
	return await res.json() as NpmPackument;
}

function isExactPin(range: string): boolean {
	const parsed = semver.valid(range);
	return parsed !== null && parsed === range.trim();
}

function resolveRange(range: string, packument: NpmPackument): string | undefined {
	const distTags = packument['dist-tags'] ?? {};
	const versions = Object.keys(packument.versions ?? {});

	// dist-tag (e.g. "latest", "next")
	if (distTags[range]) {
		return distTags[range];
	}

	if (range === '' || range === '*' || range === 'latest') {
		return distTags.latest ?? semver.maxSatisfying(versions, '*') ?? undefined;
	}

	// Range expression -> pick the highest version that satisfies it.
	return semver.maxSatisfying(versions, range, { includePrerelease: false }) ?? undefined;
}

async function check(name: string, range: string, authHeader: string): Promise<Result> {
	try {
		const packument = await fetchPackument(name, authHeader);
		if (!packument) {
			return { kind: 'not-found', name, range };
		}
		const resolved = resolveRange(range, packument);
		if (!resolved) {
			return { kind: 'no-match', name, range, available: Object.keys(packument.versions ?? {}) };
		}
		return { kind: 'ok', name, range, resolved, exact: isExactPin(range) };
	} catch (err) {
		return { kind: 'error', name, range, message: (err as Error).message };
	}
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
	const queue = items.slice();
	const results: R[] = [];
	const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
		while (queue.length > 0) {
			const item = queue.shift() as T;
			results.push(await worker(item));
		}
	});
	await Promise.all(runners);
	return results;
}

async function main(): Promise<void> {
	const input = argv[2];
	if (!input) {
		console.error('Usage: check-feed-availability <path/to/package.json>');
		exit(2);
	}

	const raw = await readFile(input, 'utf8');
	const pkg = JSON.parse(raw) as PackageJson;
	const merged: Array<{ name: string; range: string; section: 'dependencies' | 'devDependencies' }> = [];
	for (const [name, range] of Object.entries(pkg.dependencies ?? {})) {
		merged.push({ name, range, section: 'dependencies' });
	}
	for (const [name, range] of Object.entries(pkg.devDependencies ?? {})) {
		merged.push({ name, range, section: 'devDependencies' });
	}
	merged.sort((a, b) => a.name.localeCompare(b.name));

	if (merged.length === 0) {
		stdout.write('No dependencies or devDependencies found.\n');
		return;
	}

	stdout.write(`Using feed: ${FEED_REGISTRY}\n`);
	stdout.write('Signing in to Azure DevOps (a browser tab may open on first run)...\n');
	const credential = createCredential();
	const token = await acquireToken(credential);
	const authHeader = getAuthHeader(token.token);
	stdout.write('Authenticated.\n\n');

	const results = await runWithConcurrency(merged, 8, ({ name, range }) => check(name, range, authHeader));
	results.sort((a, b) => a.name.localeCompare(b.name));

	const nameWidth = Math.max(...results.map(r => r.name.length));
	let failures = 0;
	let resolved = 0;

	for (const r of results) {
		const padName = r.name.padEnd(nameWidth);
		switch (r.kind) {
			case 'ok':
				if (r.exact) {
					stdout.write(`[OK]      ${padName}  ${r.range}\n`);
				} else {
					stdout.write(`[RESOLVE] ${padName}  ${r.range}  ->  ${r.resolved}\n`);
					resolved++;
				}
				break;
			case 'no-match': {
				failures++;
				const tail = r.available.slice(-5).join(', ');
				const hint = r.available.length > 5 ? ` (showing last 5 of ${r.available.length})` : '';
				stdout.write(`[MISS]    ${padName}  ${r.range}  -- no satisfying version; available: ${tail}${hint}\n`);
				break;
			}
			case 'not-found':
				failures++;
				stdout.write(`[404]     ${padName}  ${r.range}  -- package is not in the feed\n`);
				break;
			case 'error':
				failures++;
				stdout.write(`[ERROR]   ${padName}  ${r.range}  -- ${r.message}\n`);
				break;
		}
	}

	stdout.write(`\nSummary: ${results.length - failures}/${results.length} satisfied; ${resolved} resolved from range; ${failures} problem(s).\n`);
	exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
	console.error(err);
	exit(1);
});
