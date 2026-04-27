import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type RunStatus = "idle" | "running" | "passed" | "failed";

type RunState = {
  status: RunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  output: string;
};

let activeRun: ChildProcessWithoutNullStreams | null = null;
let runState: RunState = {
  status: "idle",
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  output: "",
};

const MAX_OUTPUT_CHARS = 12000;
const GENERATED_SPEC_PATH = path.join(process.cwd(), "tests", "playground.generated.spec.ts");
const DEFAULT_PLAYGROUND_CODE = [
  "await page.goto(\"https://practice.automationnest.com/landing1\");",
  "await page.locator(\"//a[text()='HTML 5 Form/Validation']\").click();",
  "await page.locator(\"#firstname\").fill(\"Udhaya Kumar\");",
  "await page.locator(\"#lastname\").fill(\"Kothandaraman\");",
  "await page.locator(\"#phone\").fill(\"9884145883\");",
  "await page.locator(\"#city\").fill(\"Chennai\");",
].join("\n");

function indentBlock(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

function writeGeneratedPlaywrightSpec(playgroundCode: string): void {
  const actionCode = (playgroundCode || "").trim() || DEFAULT_PLAYGROUND_CODE;

  const specContent = [
    'import { test } from "@playwright/test";',
    'import { Buffer } from "buffer";',
    'import { io as ioClient } from "socket.io-client";',
    "",
    'const STREAM_SERVER_URL = process.env.STREAM_SERVER_URL || "http://localhost:3000";',
    "",
    'test("Playground Live Stream", async ({ page, request }) => {',
    "  await request.get(`${STREAM_SERVER_URL}/api/socket`);",
    "",
    "  const socket = ioClient(STREAM_SERVER_URL, {",
    '    path: "/api/socket_io",',
    '    transports: ["websocket", "polling"],',
    "    reconnection: true,",
    "  });",
    "",
    "  await new Promise<void>((resolve, reject) => {",
    '    socket.on("connect", () => resolve());',
    '    socket.on("connect_error", reject);',
    "  });",
    "",
    "  try {",
    "    await page.screencast.start({",
    "      onFrame: ({ data }: { data: Buffer }) => {",
    "        if (socket.connected) {",
    '          socket.emit("frame", data.toString("base64"));',
    "        }",
    "      },",
    "      size: { width: 1280, height: 720 },",
    "      quality: 70,",
    "    });",
    "",
    indentBlock(actionCode, 4),
    "  } finally {",
    "    await page.screencast.stop();",
    "    socket.disconnect();",
    "  }",
    "});",
    "",
  ].join("\n");

  fs.writeFileSync(GENERATED_SPEC_PATH, specContent, "utf8");
}

function appendOutput(chunk: string): void {
  runState.output += chunk;
  if (runState.output.length > MAX_OUTPUT_CHARS) {
    runState.output = runState.output.slice(runState.output.length - MAX_OUTPUT_CHARS);
  }
}

function canTriggerTest(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_TRIGGER === "true";
}

function startPlaywrightRun(playgroundCode: string): void {
  writeGeneratedPlaywrightSpec(playgroundCode);

  runState = {
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    output: `Starting: npx playwright test ${GENERATED_SPEC_PATH}\n`,
  };

  const child = spawn("npx", ["playwright", "test", GENERATED_SPEC_PATH], {
    cwd: process.cwd(),
    shell: false,
    env: process.env,
  });

  activeRun = child;

  child.stdout.on("data", (data: Buffer) => {
    appendOutput(data.toString());
  });

  child.stderr.on("data", (data: Buffer) => {
    appendOutput(data.toString());
  });

  child.on("close", (code: number | null) => {
    runState.status = code === 0 ? "passed" : "failed";
    runState.exitCode = code;
    runState.finishedAt = new Date().toISOString();
    appendOutput(`\nProcess exited with code ${code}\n`);
    activeRun = null;
  });
}

export async function GET() {
  if (!canTriggerTest()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Test trigger is disabled in production unless ENABLE_TEST_TRIGGER=true",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, ...runState });
}

export async function POST(req: Request) {
  if (!canTriggerTest()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Test trigger is disabled in production unless ENABLE_TEST_TRIGGER=true",
      },
      { status: 403 }
    );
  }

  if (activeRun) {
    return NextResponse.json({ ok: true, message: "Test already running", ...runState }, { status: 202 });
  }

  const payload = (await req.json().catch(() => ({}))) as { code?: unknown };
  const playgroundCode = typeof payload.code === "string" ? payload.code : "";
  startPlaywrightRun(playgroundCode);

  return NextResponse.json({ ok: true, message: "Test started", ...runState }, { status: 202 });
}
