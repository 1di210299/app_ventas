import { db } from '../database/db';
import { ISale, ISaleItem } from '../types';

class Sale {
  // Crear una nueva venta con sus detalles
  static create(saleData: ISale, items: ISaleItem[]): Promise<ISale> {
    const { user_id, date, total, payment_method, notes, sync_status = 0 } = saleData;
    
    return new Promise((resolve, reject) => {
      // Usar transacción para asegurar integridad de datos
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.run(
          'INSERT INTO sales (user_id, date, total, payment_method, notes, sync_status) VALUES (?, ?, ?, ?, ?, ?)',
          [user_id, date || new Date().toISOString(), total, payment_method, notes, sync_status],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            
            const sale_id = this.lastID;
            const itemPromises: Promise<ISaleItem>[] = [];
            
            // Insertar todos los items de la venta
            items.forEach(item => {
              const { product_id, quantity, price } = item;
              
              const itemPromise = new Promise<ISaleItem>((resolveItem, rejectItem) => {
                db.run(
                  'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                  [sale_id, product_id, quantity, price],
                  function(itemErr) {
                    if (itemErr) {
                      rejectItem(itemErr);
                    } else {
                      // Actualizar inventario
                      db.run(
                        'UPDATE products SET stock = stock - ? WHERE id = ?',
                        [quantity, product_id],
                        function(stockErr) {
                          if (stockErr) {
                            rejectItem(stockErr);
                          } else {
                            resolveItem({ 
                              id: this.lastID, 
                              sale_id, 
                              product_id, 
                              quantity, 
                              price 
                            });
                          }
                        }
                      );
                    }
                  }
                );
              });
              
              itemPromises.push(itemPromise);
            });
            
            Promise.all(itemPromises)
              .then(saleItems => {
                db.run('COMMIT');
                resolve({ 
                  sale_id, 
                  ...saleData, 
                  items: saleItems 
                });
              })
              .catch(itemErr => {
                db.run('ROLLBACK');
                reject(itemErr);
              });
          }
        );
      });
    });
  }

  // Obtener todas las ventas de un usuario
  static getAll(userId: number, page: number = 1, limit: number = 50): Promise<ISale[]> {
    const offset = (page - 1) * limit;
    
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.* FROM sales s
         WHERE s.user_id = ?
         ORDER BY s.date DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
        (err, sales: ISale[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(sales);
          }
        }
      );
    });
  }

  // Obtener venta por ID con sus detalles
  static getById(saleId: number, userId: number): Promise<ISale | null> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM sales WHERE id = ? AND user_id = ?',
        [saleId, userId],
        (err, sale: ISale) => {
          if (err) {
            reject(err);
          } else if (!sale) {
            resolve(null);
          } else {
            // Obtener detalles de la venta
            db.all(
              `SELECT si.*, p.name as product_name
               FROM sale_items si
               JOIN products p ON p.id = si.product_id
               WHERE si.sale_id = ?`,
              [saleId],
              (itemsErr, items: ISaleItem[]) => {
                if (itemsErr) {
                  reject(itemsErr);
                } else {
                  resolve({
                    ...sale,
                    items
                  });
                }
              }
            );
          }
        }
      );
    });
  }

  // Obtener ventas por rango de fechas
  static getByDateRange(userId: number, startDate: string, endDate: string): Promise<ISale[]> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.* FROM sales s
         WHERE s.user_id = ? AND s.date BETWEEN ? AND ?
         ORDER BY s.date DESC`,
        [userId, startDate, endDate],
        (err, sales: ISale[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(sales);
          }
        }
      );
    });
  }

  // Obtener ventas que necesitan sincronización
  static getUnsynced(userId: number): Promise<ISale[]> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.* FROM sales s
         WHERE s.user_id = ? AND s.sync_status = 0
         ORDER BY s.date ASC`,
        [userId],
        (err, sales: ISale[]) => {
          if (err) {
            reject(err);
          } else {
            const salesPromises = sales.map(sale => {
              return new Promise<ISale>((resolveSale, rejectSale) => {
                db.all(
                  `SELECT * FROM sale_items WHERE sale_id = ?`,
                  [sale.id],
                  (itemsErr, items: ISaleItem[]) => {
                    if (itemsErr) {
                      rejectSale(itemsErr);
                    } else {
                      resolveSale({
                        ...sale,
                        items
                      });
                    }
                  }
                );
              });
            });

            Promise.all(salesPromises)
              .then(salesWithItems => {
                resolve(salesWithItems);
              })
              .catch(salesErr => {
                reject(salesErr);
              });
          }
        }
      );
    });
  }

  // Actualizar estado de sincronización
  static updateSyncStatus(saleId: number, syncStatus: number, userId: number): Promise<{id: number, affected: number}> {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE sales SET sync_status = ? WHERE id = ? AND user_id = ?',
        [syncStatus, saleId, userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: saleId, affected: this.changes });
          }
        }
      );
    });
  }
}

export default Sale;