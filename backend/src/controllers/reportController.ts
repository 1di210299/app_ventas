import { Request, Response } from 'express';
import Report from '../models/Report';

// @desc    Obtener resumen diario de ventas
// @route   GET /api/reports/daily
// @access  Private
export const getDailyReport = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const date = req.query.date as string;
    const report = await Report.getDailySummary(req.user.id, date);
    
    res.json(report);
  } catch (error) {
    console.error('Error al generar reporte diario:', error);
    res.status(500).json({ message: 'Error al generar reporte diario' });
  }
};

// @desc    Obtener resumen semanal de ventas
// @route   GET /api/reports/weekly
// @access  Private
export const getWeeklyReport = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const report = await Report.getWeeklySummary(req.user.id, startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error('Error al generar reporte semanal:', error);
    res.status(500).json({ message: 'Error al generar reporte semanal' });
  }
};

// @desc    Obtener resumen mensual de ventas
// @route   GET /api/reports/monthly
// @access  Private
export const getMonthlyReport = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    
    const report = await Report.getMonthlySummary(req.user.id, year, month);
    res.json(report);
  } catch (error) {
    console.error('Error al generar reporte mensual:', error);
    res.status(500).json({ message: 'Error al generar reporte mensual' });
  }
};

// @desc    Obtener estado de inventario
// @route   GET /api/reports/inventory
// @access  Private
export const getInventoryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const report = await Report.getInventoryStatus(req.user.id);
    res.json(report);
  } catch (error) {
    console.error('Error al obtener estado de inventario:', error);
    res.status(500).json({ message: 'Error al obtener estado de inventario' });
  }
};