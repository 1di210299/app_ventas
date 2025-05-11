import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Importar rutas
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import saleRoutes from './routes/sales';
import reportRoutes from './routes/reports';

// Importar inicialización de base de datos
import { initializeDatabase } from './database/db';

// Cargar variables de entorno
dotenv.config();

// Inicializar base de datos
initializeDatabase();

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '5000');

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportRoutes);

// Ruta básica para pruebas
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'VentaFácil API - Conectado correctamente!' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});