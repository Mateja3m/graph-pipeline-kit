import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execa } from 'execa';
import YAML from 'yaml';

type PipelineState = {
  build: boolean;
  test: boolean;
};

type PipelineOutput = {
  build: 'ok' | 'fail';
  tests: 'passed' | 'failed' | 'skipped';
};

type PackageJson = {
  scripts?: Record<string, string>;
};

const DEFAULT_CONFIG: PipelineState = {
  build: true,
  test: true
};

const COMMAND_TIMEOUT_MS = 30_000;

export async function runPipeline(projectDir: string): Promise<PipelineOutput> {
  const config = await loadConfig(projectDir);
  const output: PipelineOutput = {
    build: 'fail',
    tests: 'skipped'
  };

  const subgraphPath = path.join(projectDir, 'subgraph.yaml');
  const hasSubgraph = existsSync(subgraphPath);

  if (!hasSubgraph) {
    return output;
  }

  if (config.build) {
    if (hasLocalGraphCli(projectDir)) {
      const buildResult = await runCommand('npx', ['--no-install', 'graph', 'build'], projectDir);
      output.build = buildResult.ok ? 'ok' : 'fail';
    }
  } else {
    output.build = 'ok';
  }

  const hasTestScript = await packageHasTestScript(projectDir);
  if (!config.test || !hasTestScript) {
    output.tests = 'skipped';
    return output;
  }

  const testResult = await runCommand('npm', ['run', 'test'], projectDir);
  output.tests = testResult.ok ? 'passed' : 'failed';

  return output;
}

async function loadConfig(projectDir: string): Promise<PipelineState> {
  const configPath = path.join(projectDir, 'graph-pipeline.yaml');

  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const rawConfig = await readFile(configPath, 'utf8');
    const parsed = YAML.parse(rawConfig) as { pipeline?: Partial<PipelineState> } | null;

    return {
      build: parsed?.pipeline?.build ?? DEFAULT_CONFIG.build,
      test: parsed?.pipeline?.test ?? DEFAULT_CONFIG.test
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function packageHasTestScript(projectDir: string): Promise<boolean> {
  const packageJsonPath = path.join(projectDir, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const rawPackageJson = await readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(rawPackageJson) as PackageJson;

    return typeof packageJson.scripts?.test === 'string' && packageJson.scripts.test.length > 0;
  } catch {
    return false;
  }
}

function hasLocalGraphCli(projectDir: string): boolean {
  const unixBinPath = path.join(projectDir, 'node_modules', '.bin', 'graph');
  const windowsBinPath = path.join(projectDir, 'node_modules', '.bin', 'graph.cmd');

  return existsSync(unixBinPath) || existsSync(windowsBinPath);
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const result = await execa(command, args, {
      cwd,
      all: true,
      timeout: COMMAND_TIMEOUT_MS,
      reject: false
    });

    return {
      ok: result.exitCode === 0,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      stdout: '',
      stderr: message
    };
  }
}
