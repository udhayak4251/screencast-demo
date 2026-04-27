"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const DEFAULT_PLAYGROUND_CODE = `await page.goto("https://practice.automationnest.com/landing1");
await page.locator("//a[text()='HTML 5 Form/Validation']").click();
await page.locator("#firstname").fill("Udhaya Kumar");
await page.locator("#lastname").fill("Kothandaraman");
await page.locator("#phone").fill("9884145883");
await page.locator("#city").fill("Chennai");`;

type RunStatus = "idle" | "running" | "passed" | "failed";

type RunState = {
  status: RunStatus;
  output: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type RunApiResponse = {
  ok: boolean;
  status: RunStatus;
  output?: string;
  startedAt: string | null;
  finishedAt: string | null;
};

const DEFAULT_RUN_STATE: RunState = {
  status: "idle",
  output: "",
  startedAt: null,
  finishedAt: null,
};

export default function HomePage() {
  const [runState, setRunState] = useState<RunState>(DEFAULT_RUN_STATE);
  const [isStarting, setIsStarting] = useState(false);
  const [playgroundCode, setPlaygroundCode] = useState(DEFAULT_PLAYGROUND_CODE);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyRunState = (data: RunApiResponse) => {
    setRunState({
      status: data.status,
      output: data.output || "",
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
    });
  };

  const refreshRunState = async () => {
    const res = await fetch("/api/run-test");
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as RunApiResponse;
    applyRunState(data);
  };

  useEffect(() => {
    void refreshRunState();
  }, []);

  useEffect(() => {
    if (runState.status !== "running") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => {
      void refreshRunState();
    }, 1500);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [runState.status]);

  const triggerTest = async () => {
    setIsStarting(true);
    try {
      const res = await fetch("/api/run-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: playgroundCode }),
      });

      if (!res.ok) {
        setRunState((prev) => ({
          ...prev,
          status: "failed",
          output: `${prev.output}\nFailed to start test. HTTP ${res.status}`.trim(),
        }));
        return;
      }

      const data = (await res.json()) as RunApiResponse;
      applyRunState(data);
    } finally {
      setIsStarting(false);
    }
  };

  const canStart = runState.status !== "running" && !isStarting;

  return (
    <main className="container">
      <section className="card">
        <p className="kicker">Playwright + Socket.IO + Next.js</p>
        <h1>Live Screencast Relay</h1>
        <p>
          This app receives base64 JPEG frames from your Playwright test and renders them in near real-time on a dedicated listener page.
        </p>
        <div className="actions">
          <Link href="/livestream" className="btn primary">
            Open Live Stream
          </Link>
          <a href="/api/health" className="btn ghost">
            Health Check
          </a>
          <button type="button" className="btn runner" onClick={triggerTest} disabled={!canStart}>
            {isStarting ? "Starting..." : runState.status === "running" ? "Test Running..." : "Run Playwright Test"}
          </button>
        </div>

        <div className="runnerPanel">
          <p className="runnerMeta">Status: {runState.status}</p>
          {runState.startedAt ? <p className="runnerMeta">Started: {runState.startedAt}</p> : null}
          {runState.finishedAt ? <p className="runnerMeta">Finished: {runState.finishedAt}</p> : null}
          <pre className="runnerOutput">{runState.output || "No test run yet."}</pre>
        </div>

        <div className="playgroundPanel">
          <h2 className="playgroundTitle">Playwright Playground</h2>
          <p className="playgroundHint">Enter Playwright actions using page, then click Run Playwright Test to execute and stream live.</p>
          <textarea
            className="codeEditor"
            value={playgroundCode}
            onChange={(event) => setPlaygroundCode(event.target.value)}
            spellCheck={false}
          />
        </div>
      </section>

      <section className="card streamEmbedCard">
        <h2 className="embedTitle">Live Stream</h2>
        <p className="embedHint">
          Embedded listener page from <strong>/livestream</strong>.
        </p>
        <div className="embedWrap">
          <iframe title="Live Stream" src="/livestream" className="streamEmbed" />
        </div>
      </section>
    </main>
  );
}
