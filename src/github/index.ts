import { execFile } from 'child_process';

export async function ghExec(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('gh', args, (error, stdout, stderr) => {
      if (error) {
        const message = stderr?.trim() || error.message;
        reject(new Error(message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export async function checkGhAvailable(): Promise<{
  available: boolean;
  authenticated: boolean;
}> {
  try {
    await ghExec(['--version']);
  } catch {
    return { available: false, authenticated: false };
  }

  try {
    await ghExec(['auth', 'status']);
    return { available: true, authenticated: true };
  } catch {
    return { available: true, authenticated: false };
  }
}
