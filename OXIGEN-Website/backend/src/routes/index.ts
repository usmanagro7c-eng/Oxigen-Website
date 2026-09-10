import { Router, type IRouter } from "express";
import healthRouter   from "./health.js";
import itemsRouter    from "./items.js";
import authRouter     from "./auth.js";
import userRouter     from "./user.js";
import customerRouter from "./customer.js";
import adminRouter    from "./admin.js";
import erpRouter      from "./erp.js";
import contactRouter  from "./contact.js";
import settingsRouter from "./settings.js";
import contentRouter  from "./content.js";
import bannersRouter  from "./banners.js";
import siteContentRouter from "./site-content.js";

const router: IRouter = Router();

// Public/unauthenticated routers first. Guarded routers (admin/erp/settings/
// content) use a pathless `router.use(requireAuth)` internally, which in
// Express intercepts every request that reaches them — so they must be mounted
// AFTER all public routes to avoid swallowing them.
router.use(healthRouter);
router.use(itemsRouter);
router.use(authRouter);
router.use(userRouter);
router.use(customerRouter);
router.use(bannersRouter);
router.use(siteContentRouter);
router.use(contactRouter);

// Admin-guarded routers last
router.use(adminRouter);
router.use(erpRouter);
router.use(settingsRouter);
router.use(contentRouter);

export default router;