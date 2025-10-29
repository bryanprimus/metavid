#!/usr/bin/env bun
import pkg from "./package.json" assert { type: "json" };

import { Command } from "@commander-js/extra-typings";
import path from "node:path";
import { fileTypeFromBlob } from "file-type";

const program = new Command();

const isMpegTs = async (f: Bun.BunFile) =>
  (await fileTypeFromBlob(f))?.mime?.toLowerCase() === "video/mp2t";

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)
  .option("-f, --file-name <fileNamePath>", "Specify a file name path")
  .option("-d, --folder-name <folderNamePath>", "Specify a folder name path")
  .action(async (options) => {
    if (options.fileName) {
      console.log(`Processing file: ${options.fileName}`);
      // Implement your file processing logic here, Bry
      return;
    }

    if (options.folderName) {
      console.log(`Processing folder: ${options.folderName}`);

      const files: string[] = [];
      const glob = new Bun.Glob(
        "**/*.{mp4,mkv,webm,mov,avi,m4v,flv,wmv,ts,m2ts,mts,mpeg,mpg,3gp,3g2,ogv}",
      );

      for await (const rel of glob.scan({
        cwd: options.folderName,
        onlyFiles: true,
        dot: false,
      })) {
        const abs = path.join(options.folderName, rel);
        const f = Bun.file(abs);
        if (!(await f.exists())) continue;

        const ext = path.extname(rel).slice(1).toLowerCase();

        if (ext === "ts") {
          if (await isMpegTs(f)) files.push(path.basename(abs));
          continue;
        }

        files.push(path.basename(abs));
      }

      console.log(files);
      return;
    }

    if (!options.fileName && !options.folderName) {
      console.log("No file or folder path provided, try --help");
    }
  });

program.parse(process.argv);
