import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export async function runCode({ language, code, timeoutSec = 10 }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderbot-'));

  try {
    let filePath = path.join(dir, 'main.js');
    let cmd = 'node';
    let args = [filePath];

    if (language === 'python' || language === 'py') {
      filePath = path.join(dir, 'main.py');
      cmd = 'python3';
      args = [filePath];
    }

    if (language === 'javascript' || language === 'js') {
      filePath = path.join(dir, 'main.js');
      cmd = 'node';
      args = [filePath];
    }

    await fs.writeFile(filePath, code, 'utf8');

    return await new Promise((resolve, reject) => {
      execFile(cmd, args, { timeout: timeoutSec * 1000 }, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`${error.message}\n${stderr || ''}`));
        }
        resolve({ stdout, stderr });
      });
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
