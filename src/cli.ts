import { runPipeline } from './run-pipeline.js';

async function main(): Promise<void> {
  const [, , command] = process.argv;

  if (command !== 'run') {
    console.error('Usage: graph-pipeline run');
    process.exit(1);
  }

  const result = await runPipeline(process.cwd());
  console.log(JSON.stringify(result, null, 2));
}

void main();
