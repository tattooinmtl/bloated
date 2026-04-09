import * as crypto from 'crypto';
import * as fs from 'fs';
import * as https from 'https';

const VT_BASE = 'https://www.virustotal.com/api/v3';

/** Rate-limited queue: max 4 requests per minute for VT free tier */
class RateLimitQueue {
  private queue: (() => void)[] = [];
  private timestamps: number[] = [];
  private readonly maxPerMinute = 4;

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);
    if (this.timestamps.length < this.maxPerMinute) {
      this.timestamps.push(now);
      return;
    }
    const waitMs = 60_000 - (now - this.timestamps[0]) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return this.waitForSlot();
  }
}

const rateLimiter = new RateLimitQueue();

/** Compute SHA-256 hash of a file */
export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

interface VTResponse {
  positives: number;
  total: number;
  engines: Record<string, { detected: boolean; result: string | null }>;
}

/** Look up a file hash on VirusTotal. Returns null if hash not found (404). */
export async function lookupHash(sha256: string, apiKey: string): Promise<VTResponse | null> {
  await rateLimiter.waitForSlot();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.virustotal.com',
      path: `/api/v3/files/${sha256}`,
      method: 'GET',
      headers: { 'x-apikey': apiKey },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk: string) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 404) return resolve(null);
        if (res.statusCode !== 200) return reject(new Error(`VT API ${res.statusCode}: ${body.slice(0, 200)}`));
        try {
          const json = JSON.parse(body);
          const stats = json.data?.attributes?.last_analysis_stats ?? {};
          const results = json.data?.attributes?.last_analysis_results ?? {};

          const engines: VTResponse['engines'] = {};
          for (const [name, info] of Object.entries(results) as [string, any][]) {
            engines[name] = {
              detected: info.category === 'malicious' || info.category === 'suspicious',
              result: info.result ?? null,
            };
          }

          resolve({
            positives: (stats.malicious ?? 0) + (stats.suspicious ?? 0),
            total: Object.keys(results).length,
            engines,
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}
