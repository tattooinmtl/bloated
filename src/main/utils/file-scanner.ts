import * as fs from 'fs';
import * as path from 'path';

/** Yield to the event loop so the Electron window can repaint. */
const yieldToUI = () => new Promise<void>((resolve) => setImmediate(resolve));

export interface DirStats {
  totalSize: number;
  fileCount: number;
  lastModified: number;
  files: { path: string; size: number; lastModified: number }[];
}

/**
 * Recursively scan a directory and collect size / file stats.
 * Yields to the event loop periodically so the window stays responsive.
 */
export async function scanDirectory(
  dirPath: string,
  onFile?: (filePath: string, size: number) => void,
): Promise<DirStats> {
  const result: DirStats = { totalSize: 0, fileCount: 0, lastModified: 0, files: [] };

  if (!fs.existsSync(dirPath)) return result;

  const stack: string[] = [dirPath];
  let tick = 0;

  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          stack.push(fullPath);
          tick++;
          if (tick % 30 === 0) await yieldToUI();
        } else if (entry.isFile()) {
          const stat = fs.statSync(fullPath);
          const size = stat.size;
          const mtime = stat.mtimeMs;
          result.totalSize += size;
          result.fileCount++;
          if (mtime > result.lastModified) result.lastModified = mtime;
          result.files.push({ path: fullPath, size, lastModified: mtime });
          onFile?.(fullPath, size);
        }
      } catch {
        // Locked / vanished file — skip it
      }
    }
  }

  return result;
}

/**
 * Get quick folder size without collecting individual file entries.
 */
export async function getFolderSize(dirPath: string): Promise<number> {
  let total = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const stack: string[] = [dirPath];
  let tick = 0;
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { continue; }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          stack.push(fullPath);
          tick++;
          if (tick % 30 === 0) await yieldToUI();
        } else if (entry.isFile()) {
          total += fs.statSync(fullPath).size;
        }
      } catch { /* skip */ }
    }
  }
  return total;
}

/**
 * Delete files/folders. Returns count of deleted and skipped.
 */
export async function deleteItems(
  paths: string[],
  mode: 'trash' | 'permanent' = 'trash',
): Promise<{ deleted: number; skipped: number; freedBytes: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;
  let skipped = 0;
  let freedBytes = 0;

  for (const p of paths) {
    try {
      const stat = fs.statSync(p);
      const size = stat.isDirectory() ? await getFolderSize(p) : stat.size;

      if (mode === 'trash') {
        // Dynamic import because trash is ESM-only
        const { default: trash } = await import('trash');
        await trash(p);
      } else {
        fs.rmSync(p, { recursive: true, force: true });
      }
      deleted++;
      freedBytes += size;
    } catch (err: any) {
      skipped++;
      errors.push(`${p}: ${err.message}`);
    }
  }

  return { deleted, skipped, freedBytes, errors };
}
