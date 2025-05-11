import { db } from '../database/db';
import { IDailySummary, IWeeklySummary, IMonthlySummary, IInventoryStatus, IProduct } from '../types';

class Report {
  // Obtener resumen diario de ventas
  static getDailySummary(userId: number, date?: string): Promise<IDailySummary> {
    const startDate = date || new Date().toISOString().split('T')[0];
    const endDate = date || new Date().toISOString().split('T')[0] + ' 23:59:59';
    
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          COUNT(*) as total_sales,
          SUM(total) as total_amount,
          AVG(total) as average_sale
         FROM sales
         WHERE user_id = ? 
         AND date BETWEEN ? AND ?`,
        [userId, startDate, endDate],
        (err, results: any[]) => {
          if (err) {
            reject(err);
          } else {
            // Obtener productos más vendidos del día
            db.all(
              `SELECT 
                p.name as product_name,
                p.id as product_id,
                SUM(si.quantity) as total_quantity,
                SUM(si.quantity * si.price) as total_amount
               FROM sale_items si
               JOIN sales s ON s.id = si.sale_id
               JOIN products p ON p.id = si.product_id
               WHERE s.user_id = ?
               AND s.date BETWEEN ? AND ?
               GROUP BY si.product_id
               ORDER BY total_quantity DESC
               LIMIT 5`,
              [userId, startDate, endDate],
              (productsErr, topProducts: any[]) => {
                if (productsErr) {
                  reject(productsErr);
                } else {
                  resolve({
                    date: startDate,
                    summary: results[0],
                    top_products: topProducts
                  });
                }
              }
            );
          }
        }
      );
    });
  }

  // Obtener resumen semanal de ventas
  static getWeeklySummary(userId: number, startDate?: string, endDate?: string): Promise<IWeeklySummary> {
    // Si no se proporcionan fechas, usar la semana actual
    if (!startDate) {
      const now = new Date();
      const day = now.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que la semana comience el lunes
      const monday = new Date(now.setDate(diff));
      startDate = monday.toISOString().split('T')[0];
      
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      endDate = sunday.toISOString().split('T')[0] + ' 23:59:59';
    }
    
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          strftime('%Y-%m-%d', date) as day,
          COUNT(*) as sales_count,
          SUM(total) as daily_total
         FROM sales
         WHERE user_id = ? 
         AND date BETWEEN ? AND ?
         GROUP BY strftime('%Y-%m-%d', date)
         ORDER BY day`,
        [userId, startDate, endDate],
        (err, dailyData: any[]) => {
          if (err) {
            reject(err);
          } else {
            // Obtener totales semanales
            db.get(
              `SELECT 
                COUNT(*) as total_sales,
                SUM(total) as total_amount,
                AVG(total) as average_sale
               FROM sales
               WHERE user_id = ? 
               AND date BETWEEN ? AND ?`,
              [userId, startDate, endDate],
              (totalsErr, totals: any) => {
                if (totalsErr) {
                  reject(totalsErr);
                } else {
                  // Obtener distribución de categorías de productos
                  db.all(
                    `SELECT 
                      p.name as product_name,
                      SUM(si.quantity) as quantity,
                      SUM(si.quantity * si.price) as amount
                     FROM sale_items si
                     JOIN sales s ON s.id = si.sale_id
                     JOIN products p ON p.id = si.product_id
                     WHERE s.user_id = ?
                     AND s.date BETWEEN ? AND ?
                     GROUP BY si.product_id
                     ORDER BY quantity DESC
                     LIMIT 10`,
                    [userId, startDate, endDate],
                    (productsErr, products: any[]) => {
                      if (productsErr) {
                        reject(productsErr);
                      } else {
                        resolve({
                          start_date: startDate,
                          end_date: endDate?.split(' ')[0] || '',
                          summary: totals,
                          daily_data: dailyData,
                          top_products: products
                        });
                      }
                    }
                  );
                }
              }
            );
          }
        }
      );
    });
  }

  // Obtener resumen mensual de ventas
  static getMonthlySummary(userId: number, year?: number, month?: number): Promise<IMonthlySummary> {
    // Si no se proporciona año/mes, usar el mes actual
    if (!year || !month) {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1; // Los meses en JS son 0-indexed
    }
    
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate(); // Último día del mes
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay} 23:59:59`;
    
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          strftime('%Y-%m-%d', date) as day,
          COUNT(*) as sales_count,
          SUM(total) as daily_total
         FROM sales
         WHERE user_id = ? 
         AND date BETWEEN ? AND ?
         GROUP BY strftime('%Y-%m-%d', date)
         ORDER BY day`,
        [userId, startDate, endDate],
        (err, dailyData: any[]) => {
          if (err) {
            reject(err);
          } else {
            // Obtener totales mensuales
            db.get(
              `SELECT 
                COUNT(*) as total_sales,
                SUM(total) as total_amount,
                AVG(total) as average_sale,
                MAX(total) as highest_sale
               FROM sales
               WHERE user_id = ? 
               AND date BETWEEN ? AND ?`,
              [userId, startDate, endDate],
              (totalsErr, totals: any) => {
                if (totalsErr) {
                  reject(totalsErr);
                } else {
                  // Obtener estado de inventario
                  db.all(
                    `SELECT 
                      id, name, stock, price
                     FROM products
                     WHERE user_id = ?
                     AND stock < 5
                     ORDER BY stock ASC
                     LIMIT 10`,
                    [userId],
                    (inventoryErr, lowStock: any[]) => {
                      if (inventoryErr) {
                        reject(inventoryErr);
                      } else {
                        // Obtener distribución de métodos de pago
                        db.all(
                          `SELECT 
                            payment_method,
                            COUNT(*) as count,
                            SUM(total) as amount
                           FROM sales
                           WHERE user_id = ?
                           AND date BETWEEN ? AND ?
                           GROUP BY payment_method`,
                          [userId, startDate, endDate],
                          (paymentErr, paymentMethods: any[]) => {
                            if (paymentErr) {
                              reject(paymentErr);
                            } else {
                              resolve({
                                month: `${year}-${month.toString().padStart(2, '0')}`,
                                start_date: startDate,
                                end_date: endDate.split(' ')[0],
                                summary: totals,
                                daily_data: dailyData,
                                payment_methods: paymentMethods,
                                low_stock_items: lowStock
                              });
                            }
                          }
                        );
                      }
                    }
                  );
                }
              }
            );
          }
        }
      );
    });
  }

  // Obtener estado de inventario
  static getInventoryStatus(userId: number): Promise<IInventoryStatus> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          id, name, description, price, cost, stock, 
          created_at, updated_at
         FROM products
         WHERE user_id = ?
         ORDER BY stock ASC`,
        [userId],
        (err, products: IProduct[]) => {
          if (err) {
            reject(err);
          } else {
            const summary = {
              total_products: products.length,
              out_of_stock: products.filter(p => p.stock <= 0).length,
              low_stock: products.filter(p => p.stock > 0 && p.stock < 5).length,
              total_inventory_value: products.reduce((sum, p) => sum + ((p.cost || p.price) * p.stock), 0)
            };
            
            resolve({
              summary,
              products
            });
          }
        }
      );
    });
  }
}

export default Report;