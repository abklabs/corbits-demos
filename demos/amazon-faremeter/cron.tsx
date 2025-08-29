import { blob } from "https://esm.town/v/std/blob";

const HOST_ORIGIN = Deno.env.get("HOST_ORIGIN");
if (!HOST_ORIGIN) throw new Error("HOST_ORIGIN must be set");

export const retryStuckFulfillments = async () => {
  const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  console.log("[cron] Checking for stuck orders...");

  const keys = await blob.list({ prefix: "order:" });
  let checkedCount = 0;
  let retriedCount = 0;

  for (const key of keys) {
    const order = await blob.getJSON<Record<string, unknown>>(key.key);
    if (!order) continue;

    checkedCount++;

    if (order.status === "paid" && order.paidAt) {
      const paidAt = Number(order.paidAt);
      const timeSincePaid = now - paidAt;

      if (timeSincePaid > STUCK_THRESHOLD_MS) {
        console.log(
          `[cron] Order ${order.orderId} stuck in paid state for ${Math.round(
            timeSincePaid / 1000,
          )}s, retrying fulfillment...`,
        );

        try {
          const resp = await fetch(
            new URL("/fulfill", HOST_ORIGIN).toString(),
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ orderId: order.orderId }),
            },
          );

          if (resp.ok) {
            const result = await resp.json();
            console.log(
              `[cron] Successfully retried fulfillment for ${order.orderId}:`,
              result.status,
            );
            retriedCount++;
          } else {
            const error = await resp.text();
            console.error(
              `[cron] Failed to retry fulfillment for ${order.orderId}:`,
              error,
            );
          }
        } catch (e) {
          console.error(
            `[cron] Error retrying fulfillment for ${order.orderId}:`,
            e,
          );
        }
      }
    }
  }

  console.log(
    `[cron] Checked ${checkedCount} orders, retried ${retriedCount} fulfillments`,
  );

  return {
    checked: checkedCount,
    retried: retriedCount,
    timestamp: new Date().toISOString(),
  };
};

export default retryStuckFulfillments;
