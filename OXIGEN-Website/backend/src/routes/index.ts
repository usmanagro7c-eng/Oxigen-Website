import { Router, type IRouter } from "express";
import healthRouter   from "./health.js";
import itemsRouter    from "./items.js";
import authRouter     from "./auth.js";
import userRouter     from "./user.js";
import customerRouter from "./customer.js";
import adminRouter    from "./admin.js";
import contactRouter  from "./contact.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(itemsRouter);
router.use(authRouter);
router.use(userRouter);
router.use(customerRouter);
router.use(adminRouter);
router.use(contactRouter);

export default router;