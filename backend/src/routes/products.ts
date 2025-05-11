import express from 'express';
import {
  getProducts,
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct
} from '../controllers/productController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Todas las rutas de productos requieren autenticación
router.use(protect);

// Rutas principales
router.route('/')
  .get(getProducts)
  .post(createProduct);

// Ruta de búsqueda (debe ir antes de la ruta dinámica :id)
router.get('/search', searchProducts);

// Rutas con ID de producto
router.route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

// Ruta para actualizar stock
router.patch('/:id/stock', updateStock);

export default router;