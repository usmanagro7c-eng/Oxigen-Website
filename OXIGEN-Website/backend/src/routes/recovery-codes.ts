import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { generateCodes, countCodes } from "../lib/recovery-codes.js";

const router: IRouter = Router();

// GET /api/user/recovery-codes -> { count }
router.get("/user/recovery-codes", requireAuth, async (req, res) => {
  const email = req.loggedInEmail!;
  res.json({ count: countCodes(email) });
});

// POST /api/user/recovery-codes/generate -> { codes: string[] }
router.post("/user/recovery-codes/generate", requireAuth, async (req, res) => {
  const email = req.loggedInEmail!;
  const codes = generateCodes(email, 10);
  res.json({ codes });
});

export default router;