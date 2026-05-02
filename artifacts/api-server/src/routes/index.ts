import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scenesRouter from "./scenes";
import storageRouter from "./storage";
import meRouter from "./me";
import biblesRouter from "./bibles";
import passageRouter from "./passage";
import coverRouter from "./cover";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scenesRouter);
router.use(storageRouter);
router.use(meRouter);
router.use(biblesRouter);
router.use(passageRouter);
router.use(coverRouter);

export default router;
