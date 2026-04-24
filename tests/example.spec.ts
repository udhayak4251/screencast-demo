import { test } from "@playwright/test";
import { Buffer } from "buffer";
import { io as ioClient } from "socket.io-client";



// test.beforeEach(async ({ page }) => {
//   // Start the screencast stream
//   await page.screencast.start({
//     onFrame: ({ data }: { data: Buffer }) => {
//       // Send the JPEG buffer to the server, which relays to viewers
//       socket.emit("frame", data.toString("base64"));
//     },
//     size: { width: 1280, height: 720 },
//     quality: 70,
//   });
//   await new Promise<void>((resolve) => socket.on("connect", () => resolve()));
// });

// test.afterEach(async ({ page }) => {
//   await page.screencast.stop();
//   socket.disconnect();
// });

test("Live TypeScript Telecast", async ({ page }) => {
  var socket = ioClient("http://localhost:3000");
  // Start the screencast stream
  await page.screencast.start({
    onFrame: ({ data }: { data: Buffer }) => {
      // Send the JPEG buffer to the server, which relays to viewers
      socket.emit("frame", data.toString("base64"));
    },
    size: { width: 1280, height: 720 },
    quality: 70,
  });
  await new Promise<void>((resolve) => socket.on("connect", () => resolve()));


  // Execute browser actions
  await page.goto("https://practice.automationnest.com/landing1");
  await page.locator("//a[text()='HTML 5 Form/Validation']").click();
  await page.locator("#firstname").fill("Udhaya Kumar");
  await page.locator("#lastname").fill("Kothandaraman");
  await page.locator("#phone").fill("9884145883");
  await page.locator("#city").fill("Chennai")
  
  
});
