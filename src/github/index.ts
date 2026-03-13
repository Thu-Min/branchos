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

export async function captureAssignee(): Promise<string | null> {
  const { available, authenticated } = await checkGhAvailable();
  if (!available) {
    console.warn('GitHub CLI (gh) not found. Install it to enable assignee tracking.');
    return null;
  }
  if (!authenticated) {
    throw new Error('GitHub CLI is installed but not authenticated. Run `gh auth login` first, then retry.');
  }
  const raw = await ghExec(['api', '/user']);
  const user = JSON.parse(raw);
  return user.login;
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
