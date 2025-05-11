import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';
import * as Network from 'expo-network';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';

// Definir interfaces para los tipos de datos de reportes
interface DailySalesData {
  date: string;
  totalSales: number;
  salesCount: number;
}

interface ProductSalesData {
  id: number;
  name: string;
  quantity: number;
  total: number;
}

interface ReportsState {
  dailySalesData: DailySalesData[];
  topProducts: ProductSalesData[];
  salesByPaymentMethod: { method: string; total: number }[];
  totalSalesAmount: number;
  averageSaleAmount: number;
  salesCount: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  isLoading: boolean;
  error: string | null;
  generateReports: (startDate: Date, endDate: Date) => Promise<void>;
  setDateRange: (startDate: Date, endDate: Date) => void;
  fetchReportsFromServer: () => Promise<boolean>;
}

// Abrir la base de datos local
const db = SQLite.openDatabase('ventafacil.db');
const API_URL = 'http://localhost:5000/api';

export const useReportStore = create<ReportsState>((set, get) => ({
  dailySalesData: [],
  topProducts: [],
  salesByPaymentMethod: [],
  totalSalesAmount: 0,
  averageSaleAmount: 0,
  salesCount: 0,
  dateRange: {
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
  },
  isLoading: false,
  error: null,

  // Establecer rango de fechas
  setDateRange: (startDate: Date, endDate: Date) => {
    set({
      dateRange: {
        startDate,
        endDate,
      }
    });
    
    // Generar reportes automáticamente con el nuevo rango de fechas
    get().generateReports(startDate, endDate);
  },

  // Generar reportes a partir de los datos locales
  generateReports: async (startDate: Date, endDate: Date) => {
    try {
      set({ isLoading: true, error: null });
      
      // Formatear fechas para consultas SQL
      const formattedStartDate = startOfDay(startDate).toISOString();
      const formattedEndDate = endOfDay(endDate).toISOString();
      
      // 1. Obtener ventas por día
      const dailySalesData = await new Promise<DailySalesData[]>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `SELECT 
              date(date) as day,
              SUM(total) as total_sales,
              COUNT(*) as sales_count
            FROM sales
            WHERE date BETWEEN ? AND ?
            GROUP BY day
            ORDER BY day`,
            [formattedStartDate, formattedEndDate],
            (_, { rows }) => {
              const data = rows._array.map(row => ({
                date: row.day,
                totalSales: row.total_sales,
                salesCount: row.sales_count,
              }));
              resolve(data);
            },
            (_, error) => {
              console.error('Error al obtener ventas diarias:', error);
              reject(error);
              return false;
            }
          );
        });
      });

      // 2. Obtener productos más vendidos
      const topProducts = await new Promise<ProductSalesData[]>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `SELECT 
              si.product_id as id,
              si.product_name as name,
              SUM(si.quantity) as quantity,
              SUM(si.quantity * si.price) as total
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            WHERE s.date BETWEEN ? AND ?
            GROUP BY si.product_id, si.product_name
            ORDER BY quantity DESC
            LIMIT 10`,
            [formattedStartDate, formattedEndDate],
            (_, { rows }) => {
              resolve(rows._array);
            },
            (_, error) => {
              console.error('Error al obtener productos más vendidos:', error);
              reject(error);
              return false;
            }
          );
        });
      });

      // 3. Obtener ventas por método de pago
      const salesByPaymentMethod = await new Promise<{ method: string; total: number }[]>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `SELECT 
              payment_method as method,
              SUM(total) as total
            FROM sales
            WHERE date BETWEEN ? AND ?
            GROUP BY payment_method
            ORDER BY total DESC`,
            [formattedStartDate, formattedEndDate],
            (_, { rows }) => {
              resolve(rows._array);
            },
            (_, error) => {
              console.error('Error al obtener ventas por método de pago:', error);
              reject(error);
              return false;
            }
          );
        });
      });

      // 4. Obtener estadísticas generales
      const generalStats = await new Promise<{
        totalSalesAmount: number;
        averageSaleAmount: number;
        salesCount: number;
      }>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `SELECT 
              SUM(total) as total_sales_amount,
              AVG(total) as average_sale_amount,
              COUNT(*) as sales_count
            FROM sales
            WHERE date BETWEEN ? AND ?`,
            [formattedStartDate, formattedEndDate],
            (_, { rows }) => {
              const data = rows.item(0);
              resolve({
                totalSalesAmount: data.total_sales_amount || 0,
                averageSaleAmount: data.average_sale_amount || 0,
                salesCount: data.sales_count || 0,
              });
            },
            (_, error) => {
              console.error('Error al obtener estadísticas generales:', error);
              reject(error);
              return false;
            }
          );
        });
      });

      // Actualizar el estado con todos los datos de reportes
      set({
        dailySalesData,
        topProducts,
        salesByPaymentMethod,
        totalSalesAmount: generalStats.totalSalesAmount,
        averageSaleAmount: generalStats.averageSaleAmount,
        salesCount: generalStats.salesCount,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error al generar reportes:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  // Obtener reportes desde el servidor (más detallados)
  fetchReportsFromServer: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        throw new Error('No estás autenticado');
      }
      
      // Verificar conexión a internet
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        throw new Error('No hay conexión a internet');
      }
      
      const { dateRange } = get();
      const startDateFormatted = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDateFormatted = format(dateRange.endDate, 'yyyy-MM-dd');
      
      // Solicitar reportes al servidor
      const response = await fetch(
        `${API_URL}/reports?startDate=${startDateFormatted}&endDate=${endDateFormatted}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener reportes del servidor');
      }
      
      const serverReports = await response.json();
      
      // Actualizar el estado con los datos del servidor
      // (asumiendo que el servidor devuelve los datos en el mismo formato)
      set({
        dailySalesData: serverReports.dailySalesData || [],
        topProducts: serverReports.topProducts || [],
        salesByPaymentMethod: serverReports.salesByPaymentMethod || [],
        totalSalesAmount: serverReports.totalSalesAmount || 0,
        averageSaleAmount: serverReports.averageSaleAmount || 0,
        salesCount: serverReports.salesCount || 0,
        isLoading: false,
      });
      
      return true;
    } catch (error: any) {
      console.error('Error al obtener reportes del servidor:', error);
      set({ isLoading: false, error: error.message });
      return false;
    }
  },
}));