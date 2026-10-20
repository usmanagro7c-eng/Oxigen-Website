import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Public config consumed by the admin UI so warehouse names are not hardcoded
// in the frontend. Values come from the backend environment (DEFAULT_WAREHOUSE /
// ONLINE_WAREHOUSE / MAIN_WAREHOUSE), falling back to a sensible default.
router.get("/config", (_req, res) => {
  const main = (process.env.MAIN_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || process.env.ONLINE_WAREHOUSE || "Oxigen Warehouse - O").trim();
  const online = (process.env.ONLINE_WAREHOUSE || main).trim();
  const def = (process.env.DEFAULT_WAREHOUSE || main).trim();
  res.json({
    data: {
      default_warehouse: def,
      online_warehouse: online,
      main_warehouse: main,
    },
  });
});

export default router;