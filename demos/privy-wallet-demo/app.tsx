import { Hono } from "npm:hono@3";
import { index } from "./frontend/index.tsx";
import { css } from "./frontend/css.tsx";
import { js } from "./frontend/js.tsx";
import logo from "./frontend/logo.tsx";

const PRIVY_APP_ID = Deno.env.get("PRIVY_APP_ID");

if (!PRIVY_APP_ID) {
  throw new Error("PRIVY_APP_ID environment variable must be set");
}

const app = new Hono();

app.get("/", index);
app.get("/app.css", css);
app.get("/app.js", js);
app.get("/logo.png", logo);

export default app.fetch;
