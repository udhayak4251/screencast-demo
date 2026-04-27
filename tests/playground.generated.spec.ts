import { test } from "@playwright/test";
import { Buffer } from "buffer";
import { io as ioClient } from "socket.io-client";

const STREAM_SERVER_URL = process.env.STREAM_SERVER_URL || "http://localhost:3000";

test("Playground Live Stream", async ({ page, request }) => {
  await request.get(`${STREAM_SERVER_URL}/api/socket`);

  const socket = ioClient(STREAM_SERVER_URL, {
    path: "/api/socket_io",
    transports: ["websocket", "polling"],
    reconnection: true,
  });

  await new Promise<void>((resolve, reject) => {
    socket.on("connect", () => resolve());
    socket.on("connect_error", reject);
  });

  try {
    await page.screencast.start({
      onFrame: ({ data }: { data: Buffer }) => {
        if (socket.connected) {
          socket.emit("frame", data.toString("base64"));
        }
      },
      size: { width: 1280, height: 720 },
      quality: 70,
    });

    await page.goto("https://practice.automationnest.com/landing1");
    await page.locator("//a[text()='HTML 5 Form/Validation']").click();
    await page.locator("#firstname").fill("Udhaya Kumar");
    await page.locator("#lastname").fill("Kothandaraman");
    await page.locator("#phone").fill("9884145883");
    await page.locator("#city").fill("Chennai");
  } finally {
    await page.screencast.stop();
    socket.disconnect();
  }
});
