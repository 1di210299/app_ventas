import { db } from '../database/db';
import { IProduct } from '../types';

class Product {
  // Obtener todos los productos de un usuario
  static getAll(userId: number): Promise<IProduct[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM products WHERE user_id = ? ORDER BY name', 
        [userId], 
        (err, products: IProduct[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(products);
          }
        }
      );
    });
  }

  // Obtener producto por ID
  static getById(id: number, userId: number): Promise<IProduct | undefined> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM products WHERE id = ? AND user_id = ?', 
        [id, userId], 
        (err, product: IProduct) => {
          if (err) {
            reject(err);
          } else {
            resolve(product);
          }
        }
      );
    });
  }

  // Buscar productos por nombre o código de barras
  static search(query: string, userId: number): Promise<IProduct[]> {
    const searchTerm = `%${query}%`;
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM products WHERE user_id = ? AND (name LIKE ? OR barcode = ?) ORDER BY name',
        [userId, searchTerm, query],
        (err, products: IProduct[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(products);
          }
        }
      );
    });
  }

  // Crear nuevo producto
  static create(productData: IProduct): Promise<IProduct> {
    const { user_id, name, description, price, cost, stock, image, barcode } = productData;
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO products (user_id, name, description, price, cost, stock, image, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user_id, name, description, price, cost, stock || 0, image || null, barcode || null],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, ...productData });
          }
        }
      );
    });
  }

  // Actualizar producto
  static update(id: number, productData: Partial<IProduct>, userId: number): Promise<IProduct> {
    const { name, description, price, cost, stock, image, barcode } = productData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE products SET 
          name = ?, description = ?, price = ?, cost = ?, 
          stock = ?, image = ?, barcode = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND user_id = ?`,
        [name, description, price, cost, stock, image, barcode, id, userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...productData });
          }
        }
      );
    });
  }

  // Actualizar stock
  static updateStock(id: number, quantity: number, userId: number): Promise<{id: number, affected: number}> {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [quantity, id, userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, affected: this.changes });
          }
        }
      );
    });
  }

  // Eliminar producto
  static delete(id: number, userId: number): Promise<{id: number, affected: number}> {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM products WHERE id = ? AND user_id = ?', 
        [id, userId], 
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, affected: this.changes });
          }
        }
      );
    });
  }
}

export default Product;