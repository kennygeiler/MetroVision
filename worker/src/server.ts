import { createMetrovisionWorkerApp } from "./create-app.js";

const app = createMetrovisionWorkerApp();
const PORT = parseInt(process.env.PORT ?? "3100", 10);

app.listen(PORT, () => {
  console.log(`[worker] MetroVision worker listening on port ${PORT}`);
  console.log(`[worker] Health: http://localhost:${PORT}/health`);
});
