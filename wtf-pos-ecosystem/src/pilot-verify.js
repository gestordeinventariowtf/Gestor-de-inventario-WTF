import { spawn } from "node:child_process";

const steps = [
  { name: "Sintaxis", command: "npm", args: ["run", "check"] },
  { name: "Pruebas", command: "npm", args: ["test"] }
];

for (const step of steps) {
  console.log(`\n== ${step.name} ==`);
  await run(step.command, step.args);
}

console.log("\nPiloto verificable: check y pruebas completadas correctamente.");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const executable = process.platform === "win32" ? "cmd.exe" : command;
    const finalArgs = process.platform === "win32" ? ["/d", "/s", "/c", command, ...args] : args;
    const child = spawn(executable, finalArgs, {
      stdio: "inherit",
      shell: false
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} fallo con codigo ${code}`));
    });
  });
}
