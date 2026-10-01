import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const { port } = loadConfig();
createApp().listen(port, () => {
  console.log(`demo-checkout listening on ${port}`);
});
