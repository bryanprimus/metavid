#!/usr/bin/env bun
import pkg from "./package.json" assert { type: "json" };

import { Command } from "@commander-js/extra-typings";
import path from "node:path";
import { fileTypeFromBlob } from "file-type";

import {
  extractMediaMetadata,
  type MediaMetadata,
} from "./extractMediaMetadata";
import prettyMilliseconds from "pretty-ms";
import prettyBytes from "pretty-bytes";

const program = new Command();

const SUPPORTED_EXTS = new Set([
  "mp4",
  "mkv",
  "webm",
  "mov",
  "avi",
  "m4v",
  "flv",
  "wmv",
  "ts",
  "m2ts",
  "mts",
  "mpeg",
  "mpg",
  "3gp",
  "3g2",
  "ogv",
]);

const AMBIGUOUS_TS_EXTS = new Set(["ts", "m2ts", "mts"]);

async function getMediaFile(inputPath: string): Promise<string | null> {
  const absPath = path.resolve(inputPath);
  const bunFile = Bun.file(absPath);
  if (!(await bunFile.exists())) return null;

  const ext = path.extname(absPath).slice(1).toLowerCase();
  if (!SUPPORTED_EXTS.has(ext)) return null;

  if (AMBIGUOUS_TS_EXTS.has(ext)) {
    const mime = (await fileTypeFromBlob(bunFile))?.mime?.toLowerCase();
    if (mime !== "video/mp2t") return null;
  }

  return absPath;
}

async function scanFolder(root: string): Promise<string[]> {
  const VIDEO_GLOB = `**/*.{${[...SUPPORTED_EXTS].join(",")}}`;
  const files: string[] = [];
  const glob = new Bun.Glob(VIDEO_GLOB);
  for await (const rel of glob.scan({
    cwd: root,
    onlyFiles: true,
    dot: false,
  })) {
    const abs = path.join(root, rel);
    files.push(abs);
  }
  return files;
}

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)
  .option("-f, --file-path <filePath>", "Specify a file path")
  .option("-d, --folder-path <folderPath>", "Specify a folder path")
  .action(async (options) => {
    if (options.filePath && options.folderPath) {
      console.error("Pass either --file-path or --folder-path, not both");
      process.exit(1);
    }

    if (options.filePath) {
      const f = await getMediaFile(options.filePath);
      if (f) {
        const metadata = await extractMediaMetadata(f);

        if (metadata) {
          console.log({
            ...metadata,
            Duration: prettyMilliseconds(metadata.Duration),
            FileSize: prettyBytes(metadata.FileSize),
          });
        } else {
          console.log("No metadata found");
        }
      }
      process.exit(0);
    }

    if (options.folderPath) {
      console.log(`Processing folder: ${options.folderPath}`);
      const candidates = await scanFolder(options.folderPath);
      const absPaths: string[] = [];
      for (const abs of candidates) {
        const f = await getMediaFile(abs);
        if (f) absPaths.push(f);
      }
      let metadatas: MediaMetadata[] = [];
      for (const abs of absPaths) {
        const metadata = await extractMediaMetadata(abs);
        if (metadata) {
          metadatas.push(metadata);
        }
      }
      if (metadatas.length > 0) {
        console.log({
          totalFileSize: prettyBytes(metadatas.reduce((acc, metadata) => acc + metadata.FileSize, 0)),
          totalDuration: prettyMilliseconds(metadatas.reduce((acc, metadata) => acc + metadata.Duration, 0)),
          metadatas: metadatas.map((metadata) => {
            return {
              ...metadata,
              Duration: prettyMilliseconds(metadata.Duration),
              FileSize: prettyBytes(metadata.FileSize),
            };
          }),
        });
      } else {
        console.log("No media files found in the folder");
      }
      process.exit(0);
    }

    if (!options.filePath && !options.folderPath) {
      console.log("No file or folder path provided, try --help");
      process.exit(1);
    }
  });

program.parse(process.argv);
