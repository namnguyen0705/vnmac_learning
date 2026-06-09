import fs from "fs";
import path from "path";
import { createServer } from "vite";

function readOption(args, name, fallback) {
  const index = args.indexOf(name);
  if (index >= 0 && index + 1 < args.length) {
    return args[index + 1];
  }

  const inline = args.find((item) => item.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }

  return fallback;
}

const currentWorkingDirectory = process.cwd();
const projectRoot = fs.realpathSync.native?.(currentWorkingDirectory) ?? fs.realpathSync(currentWorkingDirectory);
const args = process.argv.slice(2);
const host = readOption(args, "--host", "localhost");
const port = Number(readOption(args, "--port", "5173"));
const strictPort = args.includes("--strictPort");

process.chdir(projectRoot);

const server = await createServer({
  root: projectRoot,
  configFile: path.join(projectRoot, "vite.config.ts"),
  server: {
    host,
    port,
    strictPort,
  },
});

await server.listen();
server.printUrls();

const closeServer = async () => {
  await server.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void closeServer();
});

process.on("SIGTERM", () => {
  void closeServer();
});
