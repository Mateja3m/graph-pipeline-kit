# Graph pipeline kit

Graph pipeline kit is a small Node.js CLI that runs a basic pipeline for The Graph subgraph projects. It checks whether the current directory looks like a subgraph project, runs `graph build`, optionally runs tests, reads a lightweight YAML config when present, and always prints a predictable JSON result that is easy to consume in local scripts or CI.

## Requirements

- Node.js 20+
- npm

## Install From npm

```bash
npm install -g @idoa/graph-pipeline
```

Or run it directly:

```bash
npx @idoa/graph-pipeline run
```

## Local Development

```bash
npm install
npm run build
npm exec -- graph-pipeline run
```

## Usage

Run in a subgraph project directory:

```bash
graph-pipeline run
```

The CLI looks for:

- `subgraph.yaml`
- `graph-pipeline.yaml` (optional)
- `package.json` test script (optional)
- a local `graph` CLI in `node_modules/.bin` for the build step

Behavior:

- If `subgraph.yaml` is missing, output is still returned and the command does not crash.
- If the build command fails, output still returns JSON.
- If no `test` script exists, tests are marked as `skipped`.

Security note:

- Run this tool only in subgraph projects you trust, because it executes local build and test commands.

## Config

Create `graph-pipeline.yaml` to control which steps run:

```yaml
pipeline:
  build: true
  test: true
```

If the file does not exist or cannot be parsed, defaults are used.

## Output

Example output:

```json
{
  "build": "ok",
  "tests": "passed"
}
```

When no subgraph project is detected:

```json
{
  "build": "fail",
  "tests": "skipped"
}
```
