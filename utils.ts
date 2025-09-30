import { existsSync, mkdirSync } from 'node:fs';
import { writeFile as wf } from 'node:fs/promises';
import { dirname } from 'node:path';


export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function writeFile(path: string, data: string): Promise<void> {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    return wf(path, data);
}
