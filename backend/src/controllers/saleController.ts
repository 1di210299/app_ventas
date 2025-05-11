import { Request, Response } from 'express';
import Sale from '../models/Sale';
import { ISale, ISaleItem } from '../types';

// @desc    Obtener todas las ventas
// @route   GET /api/sales
// @access  Private
export const getSales = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const sales = await Sale.getAll(req.user.id, page, limit);
    res.json(sales);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ message: 'Error al obtener ventas' });
  }
};

// @desc    Obtener una venta por ID
// @route   GET /api/sales/:id
// @access  Private
export const getSaleById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const saleId = parseInt(req.params.id);
    const sale = await Sale.getById(saleId, req.user.id);
    
    if (!sale) {
      res.status(404).json({ message: 'Venta no encontrada' });
      return;
    }
    
    res.json(sale);
  } catch (error) {
    console.error(`Error al obtener venta ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al obtener venta' });
  }
};

// @desc    Obtener ventas por rango de fechas
// @route   GET /api/sales/date-range
// @access  Private
export const getSalesByDateRange = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({ message: 'Fechas de inicio y fin son requeridas' });
      return;
    }
    
    const sales = await Sale.getByDateRange(
      req.user.id, 
      startDate as string, 
      endDate as string
    );
    
    res.json(sales);
  } catch (error) {
    console.error('Error al obtener ventas por rango de fechas:', error);
    res.status(500).json({ message: 'Error al obtener ventas por rango de fechas' });
  }
};

// @desc    Crear una nueva venta
// @route   POST /api/sales
// @access  Private
export const createSale = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const { date, total, payment_method, notes, items } = req.body;
    
    // Validación básica
    if (!total || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ 
        message: 'Total y al menos un item son requeridos para registrar una venta' 
      });
      return;
    }
    
    const saleData: ISale = {
      user_id: req.user.id,
      date: date || new Date().toISOString(),
      total: parseFloat(total),
      payment_method,
      notes,
      sync_status: 0
    };
    
    // Preparar items de la venta
    const saleItems: ISaleItem[] = items.map((item: any) => ({
      product_id: parseInt(item.product_id),
      quantity: parseInt(item.quantity),
      price: parseFloat(item.price)
    }));
    
    const sale = await Sale.create(saleData, saleItems);
    res.status(201).json(sale);
  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({ message: 'Error al crear venta' });
  }
};

// @desc    Obtener ventas que necesitan sincronización
// @route   GET /api/sales/unsynced
// @access  Private
export const getUnsyncedSales = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const unsyncedSales = await Sale.getUnsynced(req.user.id);
    res.json(unsyncedSales);
  } catch (error) {
    console.error('Error al obtener ventas no sincronizadas:', error);
    res.status(500).json({ message: 'Error al obtener ventas no sincronizadas' });
  }
};

// @desc    Actualizar estado de sincronización de una venta
// @route   PATCH /api/sales/:id/sync
// @access  Private
export const updateSyncStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const saleId = parseInt(req.params.id);
    const { sync_status } = req.body;
    
    if (sync_status === undefined) {
      res.status(400).json({ message: 'Estado de sincronización es requerido' });
      return;
    }
    
    const result = await Sale.updateSyncStatus(
      saleId, 
      parseInt(sync_status), 
      req.user.id
    );
    
    res.json(result);
  } catch (error) {
    console.error(`Error al actualizar estado de sincronización de venta ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al actualizar estado de sincronización' });
  }
};