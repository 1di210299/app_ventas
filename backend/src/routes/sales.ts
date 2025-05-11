import express from 'express';
import {
  getSales,
  getSaleById,
  getSalesByDateRange,
  createSale,
  getUnsyncedSales,
  updateSyncStatus
} from '../controllers/saleController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Todas las rutas de ventas requieren autenticación
router.use(protect);

// Rutas principales
router.route('/')
  .get(getSales)
  .post(createSale);

// Rutas específicas (deben ir antes de la ruta dinámica :id)
router.get('/date-range', getSalesByDateRange);
router.get('/unsynced', getUnsyncedSales);

// Rutas con ID de venta
router.route('/:id')
  .get(getSaleById);

// Ruta para actualizar estado de sincronización
router.patch('/:id/sync', updateSyncStatus);

export default router;