import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';

const db = SQLite.openDatabase('ventafacil.db');

// Define interfaces
export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  barcode?: string;
  category?: string;
  image_url?: string;
  sync_status: number; // 0: no sincronizado, 1: sincronizado
}

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  initializeProducts: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  searchProducts: (searchTerm: string) => Promise<Product[]>;
  getProductById: (id: number) => Promise<Product | null>;
  getProductByBarcode: (barcode: string) => Promise<Product | null>;
  addProduct: (product: Omit<Product, 'id' | 'sync_status'>) => Promise<boolean>;
  updateProduct: (product: Product) => Promise<boolean>;
  deleteProduct: (id: number) => Promise<boolean>;
  updateStock: (productId: number, quantity: number) => Promise<boolean>;
  
  // Categorías
  getCategories: () => Promise<string[]>;
  
  // Sincronización
  syncProducts: () => Promise<boolean>;
  
  // Importación/Exportación
  importProducts: (products: Array<Omit<Product, 'id' | 'sync_status'>>) => Promise<boolean>;
  exportProducts: () => Promise<Product[]>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  
  // Inicializar la tabla de productos
  initializeProducts: async () => {
    try {
      db.transaction(tx => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            barcode TEXT,
            category TEXT,
            image_url TEXT,
            sync_status INTEGER DEFAULT 0
          )`,
          [],
          () => {
            console.log('Tabla de productos inicializada');
          },
          (_, error): boolean => {
            console.error('Error creando tabla de productos:', error);
            return false;
          }
        );
      });
      
      // Cargar productos
      await get().fetchProducts();
      return Promise.resolve();
    } catch (error) {
      console.error('Error inicializando productos:', error);
      set({ error: String(error) });
      return Promise.reject(error);
    }
  },
  
  // Obtener todos los productos
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    
    return new Promise<void>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM products ORDER BY name ASC',
          [],
          (_, { rows }) => {
            const products: Product[] = rows._array;
            set({ products, isLoading: false });
            resolve();
          },
          (_, error): boolean => {
            set({ error: String(error), isLoading: false });
            reject(error);
            return false;
          }
        );
      });
    });
  },
  
  // Buscar productos por nombre o código de barras
  searchProducts: async (searchTerm: string) => {
    return new Promise<Product[]>((resolve, reject) => {
      set({ isLoading: true });
      
      // Si el término de búsqueda está vacío, devolvemos todos los productos
      if (!searchTerm.trim()) {
        set({ isLoading: false });
        resolve(get().products);
        return;
      }
      
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM products 
           WHERE LOWER(name) LIKE ? OR 
                 barcode = ? 
           ORDER BY name ASC`,
          [searchPattern, searchTerm],
          (_, { rows }) => {
            set({ isLoading: false });
            resolve(rows._array);
          },
          (_, error): boolean => {
            set({ isLoading: false, error: String(error) });
            reject([]);
            return false;
          }
        );
      });
    });
  },
  
  // Obtener producto por ID
  getProductById: async (id: number) => {
    return new Promise<Product | null>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM products WHERE id = ?',
          [id],
          (_, { rows }) => {
            if (rows.length > 0) {
              resolve(rows.item(0));
            } else {
              resolve(null);
            }
          },
          (_, error): boolean => {
            set({ error: String(error) });
            reject(null);
            return false;
          }
        );
      });
    });
  },
  
  // Obtener producto por código de barras
  getProductByBarcode: async (barcode: string) => {
    return new Promise<Product | null>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM products WHERE barcode = ?',
          [barcode],
          (_, { rows }) => {
            if (rows.length > 0) {
              resolve(rows.item(0));
            } else {
              resolve(null);
            }
          },
          (_, error): boolean => {
            set({ error: String(error) });
            reject(null);
            return false;
          }
        );
      });
    });
  },
  
  // Añadir un nuevo producto
  addProduct: async (product) => {
    set({ isLoading: true, error: null });
    
    return new Promise<boolean>((resolve, reject) => {
      // Validar datos del producto
      if (!product.name || product.price <= 0) {
        set({ isLoading: false, error: 'Datos de producto inválidos' });
        Alert.alert('Error', 'El nombre y el precio son obligatorios.');
        reject(false);
        return;
      }
      
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO products (name, description, price, stock, barcode, category, image_url, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            product.name,
            product.description || '',
            product.price,
            product.stock || 0,
            product.barcode || '',
            product.category || '',
            product.image_url || '',
          ],
          async (_, { insertId }) => {
            // Recargar productos
            await get().fetchProducts();
            set({ isLoading: false });
            resolve(true);
          },
          (_, error): boolean => {
            set({ isLoading: false, error: String(error) });
            Alert.alert('Error', 'No se pudo guardar el producto.');
            reject(false);
            return false;
          }
        );
      });
    });
  },
  
  // Actualizar un producto existente
  updateProduct: async (product) => {
    set({ isLoading: true, error: null });
    
    return new Promise<boolean>((resolve, reject) => {
      // Validar datos del producto
      if (!product.id || !product.name || product.price <= 0) {
        set({ isLoading: false, error: 'Datos de producto inválidos' });
        Alert.alert('Error', 'El nombre y el precio son obligatorios.');
        reject(false);
        return;
      }
      
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE products 
           SET name = ?, description = ?, price = ?, stock = ?, 
               barcode = ?, category = ?, image_url = ?, sync_status = 0
           WHERE id = ?`,
          [
            product.name,
            product.description || '',
            product.price,
            product.stock,
            product.barcode || '',
            product.category || '',
            product.image_url || '',
            product.id
          ],
          async () => {
            // Recargar productos
            await get().fetchProducts();
            set({ isLoading: false });
            resolve(true);
          },
          (_, error): boolean => {
            set({ isLoading: false, error: String(error) });
            Alert.alert('Error', 'No se pudo actualizar el producto.');
            reject(false);
            return false;
          }
        );
      });
    });
  },
  
  // Eliminar un producto
  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    
    return new Promise<boolean>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM products WHERE id = ?',
          [id],
          async () => {
            // Recargar productos
            await get().fetchProducts();
            set({ isLoading: false });
            resolve(true);
          },
          (_, error): boolean => {
            set({ isLoading: false, error: String(error) });
            Alert.alert('Error', 'No se pudo eliminar el producto.');
            reject(false);
            return false;
          }
        );
      });
    });
  },
  
  // Actualizar el stock de un producto
  updateStock: async (productId, quantity) => {
    return new Promise<boolean>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE products 
           SET stock = stock + ?, sync_status = 0
           WHERE id = ?`,
          [quantity, productId],
          async () => {
            // Recargar productos
            await get().fetchProducts();
            resolve(true);
          },
          (_, error): boolean => {
            set({ error: String(error) });
            reject(false);
            return false;
          }
        );
      });
    });
  },
  
  // Obtener todas las categorías disponibles
  getCategories: async () => {
    return new Promise<string[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT DISTINCT category FROM products WHERE category <> '' AND category IS NOT NULL`,
          [],
          (_, { rows }) => {
            const categories = rows._array.map(row => row.category);
            resolve(categories);
          },
          (_, error): boolean => {
            set({ error: String(error) });
            reject([]);
            return false;
          }
        );
      });
    });
  },
  
  // Sincronizar productos con el servidor
  syncProducts: async () => {
    // Esta función se implementará cuando se integre con el backend
    // Por ahora devuelve una promesa resuelta
    return Promise.resolve(true);
  },
  
  // Importar productos desde un archivo CSV o JSON
  importProducts: async (products) => {
    set({ isLoading: true, error: null });
    
    try {
      // Usamos una transacción para garantizar que todos los productos se inserten correctamente
      await new Promise<void>((resolve, reject) => {
        db.transaction(
          tx => {
            products.forEach(product => {
              tx.executeSql(
                `INSERT INTO products (name, description, price, stock, barcode, category, image_url, sync_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                  product.name,
                  product.description || '',
                  product.price,
                  product.stock || 0,
                  product.barcode || '',
                  product.category || '',
                  product.image_url || '',
                ]
              );
            });
          },
          (error) => {
            set({ isLoading: false, error: String(error) });
            reject(error);
          },
          () => {
            resolve();
          }
        );
      });
      
      // Recargar productos
      await get().fetchProducts();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false, error: String(error) });
      return false;
    }
  },
  
  // Exportar productos a formato JSON
  exportProducts: async () => {
    // Simplemente devolvemos el array de productos actual
    return get().products;
  },
}));