import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { listMembers, addMember, removeMember } from "../lib/members.js";

const router: IRouter = Router();

// GET /api/admin/members
router.get("/admin/members", requireAuth, async (_req, res) => {
  res.json({ members: listMembers() });
});

// POST /api/admin/members  body: { name, email, role }
router.post("/admin/members", requireAuth, async (req, res) => {
  const { name, email, role } = req.body as { name?: string; email?: string; role?: string };
  if (!name || !email) { res.status(400).json({ error: "name and email are required." }); return; }
  const m = addMember(name, email, role || "Member");
  res.status(201).json({ member: m });
});

// DELETE /api/admin/members/:id
router.delete("/admin/members/:id", requireAuth, async (req, res) => {
  const ok = removeMember(req.params.id);
  if (!ok) { res.status(404).json({ error: "Member not found." }); return; }
  res.json({ ok: true });
});

export default router;