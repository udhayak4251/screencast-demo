import { spawn } from "node:child_process";

let activeRun = null;
let runState = {
  status: "idle",
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  output: "",
};

const MAX_OUTPUT_CHARS = 12000;

function appendOutput(chunk) {
  runState.output += chunk;
  if (runState.output.length > MAX_OUTPUT_CHARS) {
    runState.output = runState.output.slice(runState.output.length - MAX_OUTPUT_CHARS);
  }
}

function canTriggerTest() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_TRIGGER === "true";
}

function startPlaywrightRun() {
  runState = {
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    output: "Starting: npx playwright test\n",
  };

  const child = spawn("npx", ["playwright", "test"], {
    cwd: process.cwd(),
    shell: false,
    env: process.env,
  });

  activeRun = child;

  child.stdout.on("data", (data) => {
    appendOutput(data.toString());
  });

  child.stderr.on("data", (data) => {
    appendOutput(data.toString());
  });

  child.on("close", (code) => {
    runState.status = code === 0 ? "passed" : "failed";
    runState.exitCode = code;
    runState.finishedAt = new Date().toISOString();
    appendOutput(`\nProcess exited with code ${code}\n`);
    activeRun = null;
  });
}

export default function handler(req, res) {
  if (!canTriggerTest()) {
    return res.status(403).json({
      ok: false,
      error: "Test trigger is disabled in production unless ENABLE_TEST_TRIGGER=true",
    });
  }

  if (req.method === "POST") {
    if (activeRun) {
      return res.status(202).json({ ok: true, message: "Test already running", ...runState });
    }

    startPlaywrightRun();
    return res.status(202).json({ ok: true, message: "Test started", ...runState });
  }

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, ...runState });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ ok: false, error: "Method Not Allowed" });
}
