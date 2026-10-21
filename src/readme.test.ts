// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const compiler = join(dirname(require.resolve('typescript/package.json')), 'bin/tsc');

describe('README', () => {
  it('typechecks the booking and React examples without casts', () => {
    const section = readme.split('## Paid meetings')[0] ?? '';
    const code = [...section.matchAll(/```ts\n([\s\S]*?)```/gu)]
      .map((match) => match[1])
      .join('\n')
      .replaceAll("'@moreflow/meetings'", "'../src/index'");
    const react = [...readme.matchAll(/```tsx\n([\s\S]*?)```/gu)]
      .map((match) => match[1])
      .join('\n')
      .replaceAll("'@moreflow/meetings'", "'../src/index'");
    expect(code + react).not.toMatch(/\bas\s+[A-Za-z]/u);
    const directory = mkdtempSync(fileURLToPath(new URL('../.readme-check-', import.meta.url)));
    try {
      mkdirSync(join(directory, 'types'));
      writeFileSync(join(directory, 'example.ts'), code);
      writeFileSync(join(directory, 'react.tsx'), react);
      // Executed inside agent:check test's bounded reservation, like other SDK smoke tests.
      const output = execFileSync(
        process.execPath,
        [
          compiler,
          '--singleThreaded',
          '--ignoreConfig',
          '--target',
          'es2022',
          '--module',
          'esnext',
          '--moduleResolution',
          'bundler',
          '--jsx',
          'react-jsx',
          '--strict',
          '--exactOptionalPropertyTypes',
          '--noUncheckedIndexedAccess',
          '--skipLibCheck',
          '--noEmit',
          '--typeRoots',
          join(directory, 'types'),
          join(directory, 'example.ts'),
          join(directory, 'react.tsx'),
          fileURLToPath(new URL('./arguments.test.ts', import.meta.url)),
          fileURLToPath(new URL('./reservation-flow.test.ts', import.meta.url)),
          fileURLToPath(new URL('./react.test.ts', import.meta.url))
        ],
        { encoding: 'utf8' }
      );
      expect(output).toBe('');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it('documents every SDK and meeting error code with recovery guidance', () => {
    const codes = new Set<string>();
    for (const [path, name] of [
      ['./errors.ts', 'MeetingsErrorCode'],
      ['./internal/errors.ts', 'MoreflowClientErrorCode']
    ]) {
      const source = readFileSync(new URL(path ?? '', import.meta.url), 'utf8');
      const union = source.split(`export type ${name} =`)[1]?.split(';\n')[0] ?? '';
      for (const match of union.matchAll(/'([A-Z_]+)'/gu)) if (match[1]) codes.add(match[1]);
    }
    const rows = [...readme.matchAll(/^\| `([A-Z_]+)` \| ([^|]+) \| ([^|]+) \|$/gmu)];
    expect(codes.size).toBeGreaterThan(20);
    expect(rows.map((row) => row[1]).sort()).toEqual([...codes].sort());
    expect(rows.every((row) => (row[3]?.trim().length ?? 0) > 20)).toBe(true);
  });
});
