import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'

// Crash-safe JSON/state writes: write to a unique temp file, then rename over the
// target. rename(2) is atomic on the same filesystem, so a crash or a concurrent
// writer can never leave a half-written (unparseable) state file behind.
//
// The temp name is unique per call — a shared `<file>.tmp` would let two
// concurrent writers interleave into the same temp file and rename garbage.
// Pure (no electron import) so it is unit-testable.

let _ctr = 0
function tmpPath(file: string): string {
  return `${file}.${process.pid}.${Date.now().toString(36)}.${(++_ctr).toString(36)}.tmp`
}

export function atomicWriteFileSync(file: string, data: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = tmpPath(file)
  try {
    fs.writeFileSync(tmp, data)
    fs.renameSync(tmp, file)
  } catch (err) {
    try { fs.unlinkSync(tmp) } catch {}
    throw err
  }
}

export async function atomicWriteFile(file: string, data: string): Promise<void> {
  await fsp.mkdir(path.dirname(file), { recursive: true })
  const tmp = tmpPath(file)
  try {
    await fsp.writeFile(tmp, data)
    await fsp.rename(tmp, file)
  } catch (err) {
    try { await fsp.unlink(tmp) } catch {}
    throw err
  }
}
