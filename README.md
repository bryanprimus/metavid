# metavid

Minimal CLI to print video metadata for a single file or an entire folder.

## Quick use (no install)

```bash
bunx metavid@latest -d "/absolute/path/to/folder"
bunx metavid@latest -f "./absolute/path/video.mp4"
```

> Note: Requires Bun. This does not run on Node.js.

Flags:
- `-f, --file-path` Scan a single file
- `-d, --folder-path` Scan a folder (recursive)

Pass one of the flags (not both). Prints a table; folder scans also show total duration and size.

## Roadmap

- Export as bin
- Node.js support
