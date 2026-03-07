import chalk from 'chalk';

export function output(
  data: Record<string, unknown>,
  options: { json?: boolean },
): void {
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    for (const [key, value] of Object.entries(data)) {
      const formatted =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
      console.log(`${chalk.cyan(key)}: ${formatted}`);
    }
  }
}

export function error(
  message: string,
  options: { json?: boolean },
): void {
  if (options.json) {
    console.error(JSON.stringify({ error: message }));
  } else {
    console.error(chalk.red('Error: ') + message);
  }
}

export function success(
  message: string,
  options: { json?: boolean },
): void {
  if (options.json) {
    console.log(JSON.stringify({ success: true, message }));
  } else {
    console.log(chalk.green('\u2713 ') + message);
  }
}
