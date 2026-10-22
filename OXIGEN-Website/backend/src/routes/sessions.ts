import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { listSessions, revokeSession, revokeOthers } from "../lib/sessions.js";

const router: IRouter = Router();

// GET /api/user/sessions
router.get("/user/sessions", requireAuth, async (req, res) => {
  const email = req.loggedInEmail!;
  res.json({ sessions: listSessions(email) });
});

// DELETE /api/user/sessions/:id
router.delete("/user/sessions/:id", requireAuth, async (req, res) => {
  const email = req.loggedInEmail!;
  const ok = revokeSession(email, req.params.id);
  if (!ok) { res.status(404).json({ error: "Session not found." }); return; }
  res.json({ ok: true });
});

// POST /api/user/sessions/revoke-others  body: { currentId }
router.post("/user/sessions/revoke-others", requireAuth, async (req, res) => {
  const email = req.loggedInEmail!;
  const currentId = (req.body as { currentId?: string })?.currentId ?? "";
  const removed = revokeOthers(email, currentId);
  res.json({ removed });
});

export default router;