import { ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import { CACHE_PATHS, resolveEnvPath } from '../config/cache-paths';
import { scanDirectory, deleteItems } from '../utils/file-scanner';
import type { ScanResult, ScanProgress, CleanResult, AppSettings } from '../../shared/types';

export function registerCacheScannerIPC(getSettings: () => AppSettings) {
  ipcMain.handle('cache:scan', async (event): Promise<ScanResult[]> => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const results: ScanResult[] = [];
    const settings = getSettings();

    // Merge built-in + custom paths
    const allPaths = [
      ...CACHE_PATHS,
      ...settings.customCachePaths.map((p, i) => ({
        id: `custom-${i}`,
        label: p.split('\\').pop() || p,
        category: 'other' as const,
        path: p,
        description: 'Custom path',
      })),
    ];

    for (const cp of allPaths) {
      const resolvedPath = resolveEnvPath(cp.path);
      const exists = fs.existsSync(resolvedPath);

      const progress: ScanProgress = {
        phase: 'scanning',
        current: resolvedPath,
        found: results.length,
        totalSize: results.reduce((s, r) => s + r.totalSize, 0),
      };
      win?.webContents.send('cache:scan-progress', progress);

      if (!exists) {
        results.push({
          id: cp.id,
          label: cp.label,
          category: cp.category,
          path: cp.path,
          resolvedPath,
          exists: false,
          totalSize: 0,
          fileCount: 0,
          lastModified: 0,
        });
        continue;
      }

      const stats = await scanDirectory(resolvedPath);

      results.push({
        id: cp.id,
        label: cp.label,
        category: cp.category,
        path: cp.path,
        resolvedPath,
        exists: true,
        totalSize: stats.totalSize,
        fileCount: stats.fileCount,
        lastModified: stats.lastModified,
      });
    }

    // Sort by size descending
    results.sort((a, b) => b.totalSize - a.totalSize);

    const done: ScanProgress = {
      phase: 'done',
      current: '',
      found: results.length,
      totalSize: results.reduce((s, r) => s + r.totalSize, 0),
    };
    win?.webContents.send('cache:scan-progress', done);

    return results;
  });

  ipcMain.handle('cache:clean', async (_event, paths: string[]): Promise<CleanResult> => {
    // Validate paths are strings to prevent injection
    const safePaths = paths.filter((p): p is string => typeof p === 'string' && p.length > 0);
    const settings = getSettings();
    return deleteItems(safePaths, settings.deleteMode);
  });
}
