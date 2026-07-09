"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
class Logger {
    logDir;
    constructor(logDir = "./logs") {
        this.logDir = logDir;
    }
    async write(file, message, meta) {
        await promises_1.default.mkdir(this.logDir, { recursive: true });
        const line = JSON.stringify({
            at: new Date().toISOString(),
            message,
            meta: meta ?? null
        });
        await promises_1.default.appendFile(node_path_1.default.join(this.logDir, file), `${line}\n`, "utf8");
    }
    app(message, meta) {
        return this.write("application.log", message, meta);
    }
    error(message, meta) {
        return this.write("error.log", message, meta);
    }
}
exports.Logger = Logger;
