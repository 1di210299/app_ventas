import express from 'express';
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getInventoryStatus
} from '../controllers/reportController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Todas las rutas de reportes requieren autenticación
router.use(protect);

// Rutas de reportes
router.get('/daily', getDailyReport);
router.get('/weekly', getWeeklyReport);
router.get('/monthly', getMonthlyReport);
router.get('/inventory', getInventoryStatus);

export default router;