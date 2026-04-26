import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function HomePage() {
  const [runState, setRunState] = useState({
    status: "idle",
    output: "",
    startedAt: null,
    finishedAt: null,
  });
  const [isStarting, setIsStarting] = useState(false);
  const pollRef = useRef(null);

  const refreshRunState = async () => {
    const res = await fetch("/api/run-test");
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    setRunState({
      status: data.status,
      output: data.output || "",
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
    });
  };

  useEffect(() => {
    refreshRunState();
  }, []);

  useEffect(() => {
    if (runState.status !== "running") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(refreshRunState, 1500);
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
      const res = await fetch("/api/run-test", { method: "POST" });
      const data = await res.json();
      setRunState({
        status: data.status,
        output: data.output || "",
        startedAt: data.startedAt,
        finishedAt: data.finishedAt,
      });
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
      </section>

      <section className="card streamEmbedCard">
        <h2 className="embedTitle">Live Stream</h2>
        <p className="embedHint">Embedded listener page from <strong>/livestream</strong>.</p>
        <div className="embedWrap">
          <iframe title="Live Stream" src="/livestream" className="streamEmbed" />
        </div>
      </section>
    </main>
  );
}
