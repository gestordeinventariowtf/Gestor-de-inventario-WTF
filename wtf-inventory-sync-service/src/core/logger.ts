import fs from "node:fs/promises";
import path from "node:path";

export class Logger {
  constructor(private logDir = "./logs") {}

  async write(file: "application.log" | "error.log" | "sync.log" | "icg.log" | "web.log", message: string, meta?: unknown): Promise<void> {
    await fs.mkdir(this.logDir, { recursive: true });
    const line = JSON.stringify({
      at: new Date().toISOString(),
      message,
      meta: meta ?? null
    });
    await fs.appendFile(path.join(this.logDir, file), `${line}\n`, "utf8");
  }

  app(message: string, meta?: unknown): Promise<void> {
    return this.write("application.log", message, meta);
  }

  error(message: string, meta?: unknown): Promise<void> {
    return this.write("error.log", message, meta);
  }
}
