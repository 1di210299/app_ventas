import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';
import * as Network from 'expo-network';
import { Product } from './productStore';

// Definir interfaces para los tipos de datos
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  image?: string;
}

interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  price: number;
  product?: Product;
}

interface Sale {
  id?: number;
  sale_id?: number;
  user_id?: number;
  date?: string;
  total: number;
  payment_method?: string;
  notes?: string;
  sync_status?: number;
  items?: SaleItem[];
}

interface SalesState {
  currentSale: {
    items: SaleItem[];
    total: number;
    payment_method: string;
    notes: string;
  };
  sales: Sale[];
  salesHistory: Sale[];
  isLoading: boolean;
  error: string | null;
  addItemToSale: (product: Product, quantity: number) => void;
  updateItemQuantity: (index: number, quantity: number) => void;
  removeItemFromSale: (index: number) => void;
  setPaymentMethod: (method: string) => void;
  setNotes: (notes: string) => void;
  clearSale: () => void;
  completeSale: () => Promise<boolean>;
  loadSalesHistory: () => Promise<void>;
  getSaleDetails: (saleId: number) => Promise<Sale | null>;
  syncPendingSales: () => Promise<void>;
}

// Abrir la base de datos local
const db = SQLite.openDatabase('ventafacil.db');
const API_URL = 'http://localhost:5000/api';

// Inicializar la base de datos local
const initializeDatabase = () => {
  db.transaction(tx => {
    // Tabla de ventas
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        date TEXT NOT NULL,
        total REAL NOT NULL,
        payment_method TEXT,
        notes TEXT,
        sync_status INTEGER DEFAULT 0
      )`,
      [],
      () => console.log('Tabla de ventas creada correctamente'),
      (_, error) => { console.error('Error al crear tabla de ventas:', error); return false; }
    );
    
    // Tabla de items de venta
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id)
      )`,
      [],
      () => console.log('Tabla de items de venta creada correctamente'),
      (_, error) => { console.error('Error al crear tabla de items de venta:', error); return false; }
    );
  });
};

// Inicializar la base de datos al crear el store
initializeDatabase();

export const useSalesStore = create<SalesState>((set, get) => ({
  currentSale: {
    items: [],
    total: 0,
    payment_method: 'efectivo',
    notes: '',
  },
  sales: [],
  salesHistory: [],
  isLoading: false,
  error: null,

  // Agregar un item a la venta actual
  addItemToSale: (product: Product, quantity: number) => {
    const { currentSale } = get();
    const existingItemIndex = currentSale.items.findIndex(item => item.product_id === product.id);

    let updatedItems = [...currentSale.items];
    
    if (existingItemIndex >= 0) {
      // Si el producto ya está en la lista, actualizar la cantidad
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity,
      };
    } else {
      // Agregar nuevo item
      updatedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity,
        price: product.price,
        product,
      });
    }

    // Calcular el nuevo total
    const total = updatedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    set({
      currentSale: {
        ...currentSale,
        items: updatedItems,
        total,
      },
    });
  },

  // Actualizar la cantidad de un item
  updateItemQuantity: (index: number, quantity: number) => {
    const { currentSale } = get();
    
    // No permitir cantidades negativas
    if (quantity <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a cero');
      return;
    }

    const updatedItems = [...currentSale.items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity,
    };

    const total = updatedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    set({
      currentSale: {
        ...currentSale,
        items: updatedItems,
        total,
      },
    });
  },

  // Eliminar un item de la venta
  removeItemFromSale: (index: number) => {
    const { currentSale } = get();
    
    const updatedItems = [...currentSale.items];
    updatedItems.splice(index, 1);

    const total = updatedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    set({
      currentSale: {
        ...currentSale,
        items: updatedItems,
        total,
      },
    });
  },

  // Establecer el método de pago
  setPaymentMethod: (method: string) => {
    const { currentSale } = get();
    set({
      currentSale: {
        ...currentSale,
        payment_method: method,
      },
    });
  },

  // Establecer notas
  setNotes: (notes: string) => {
    const { currentSale } = get();
    set({
      currentSale: {
        ...currentSale,
        notes,
      },
    });
  },

  // Limpiar la venta actual
  clearSale: () => {
    set({
      currentSale: {
        items: [],
        total: 0,
        payment_method: 'efectivo',
        notes: '',
      },
    });
  },

  // Completar la venta
  completeSale: async () => {
    try {
      const { currentSale } = get();
      set({ isLoading: true, error: null });
      
      if (currentSale.items.length === 0) {
        set({ isLoading: false, error: 'No hay productos en la venta' });
        Alert.alert('Error', 'No hay productos en la venta');
        return false;
      }
      
      const sale: Sale = {
        date: new Date().toISOString(),
        total: currentSale.total,
        payment_method: currentSale.payment_method,
        notes: currentSale.notes,
        sync_status: 0,
        items: currentSale.items,
      };
      
      // Guardar la venta en la base de datos local
      await new Promise<void>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `INSERT INTO sales (date, total, payment_method, notes, sync_status) 
             VALUES (?, ?, ?, ?, ?)`,
            [sale.date, sale.total, sale.payment_method, sale.notes, sale.sync_status],
            (_, { insertId }) => {
              if (insertId === undefined) {
                reject(new Error('No se pudo insertar la venta'));
                return;
              }
              
              const saleId = insertId;
              const itemPromises: Promise<void>[] = [];
              
              // Insertar los items de la venta
              currentSale.items.forEach(item => {
                const itemPromise = new Promise<void>((resolveItem, rejectItem) => {
                  tx.executeSql(
                    `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [saleId, item.product_id, item.product_name, item.quantity, item.price],
                    () => {
                      // Actualizar el stock del producto
                      tx.executeSql(
                        'UPDATE products SET stock = stock - ?, sync_status = 0 WHERE id = ?',
                        [item.quantity, item.product_id],
                        () => resolveItem(),
                        (_, error) => {
                          console.error('Error al actualizar stock:', error);
                          rejectItem(error);
                          return false;
                        }
                      );
                    },
                    (_, error) => {
                      console.error('Error al insertar item de venta:', error);
                      rejectItem(error);
                      return false;
                    }
                  );
                });
                
                itemPromises.push(itemPromise);
              });
              
              Promise.all(itemPromises)
                .then(() => resolve())
                .catch(error => reject(error));
            },
            (_, error) => {
              console.error('Error al insertar venta:', error);
              reject(error);
              return false;
            }
          );
        });
      });
      
      // Limpiar la venta actual
      get().clearSale();
      
      // Intentar sincronizar con el servidor si hay conexión
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected && networkState.isInternetReachable) {
        get().syncPendingSales();
      }
      
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      console.error('Error al completar venta:', error);
      set({ isLoading: false, error: error.message });
      Alert.alert('Error', 'No se pudo completar la venta');
      return false;
    }
  },

  // Cargar el historial de ventas
  loadSalesHistory: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Cargar ventas desde la base de datos local
      await new Promise<void>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            'SELECT * FROM sales ORDER BY date DESC',
            [],
            async (_, { rows }) => {
              const sales: Sale[] = rows._array;
              
              // Para cada venta, cargar sus items
              const salesWithItems = await Promise.all(
                sales.map(sale => 
                  new Promise<Sale>(resolveSale => {
                    tx.executeSql(
                      'SELECT * FROM sale_items WHERE sale_id = ?',
                      [sale.id],
                      (_, { rows: itemRows }) => {
                        const items = itemRows._array;
                        resolveSale({
                          ...sale,
                          items,
                        });
                      },
                      (_, error) => {
                        console.error('Error al cargar items de venta:', error);
                        resolveSale(sale);
                        return false;
                      }
                    );
                  })
                )
              );
              
              set({ salesHistory: salesWithItems, isLoading: false });
              resolve();
            },
            (_, error) => {
              console.error('Error al cargar historial de ventas:', error);
              reject(error);
              return false;
            }
          );
        });
      });
    } catch (error: any) {
      console.error('Error al cargar historial de ventas:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  // Obtener detalles de una venta específica
  getSaleDetails: async (saleId: number) => {
    try {
      set({ isLoading: true, error: null });
      
      // Buscar primero en el historial cargado
      const cachedSale = get().salesHistory.find(sale => sale.id === saleId);
      if (cachedSale && cachedSale.items) {
        set({ isLoading: false });
        return cachedSale;
      }
      
      // Si no está en caché, buscar en la base de datos local
      const sale = await new Promise<Sale | null>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            'SELECT * FROM sales WHERE id = ?',
            [saleId],
            (_, { rows }) => {
              if (rows.length === 0) {
                resolve(null);
                return;
              }
              
              const sale = rows.item(0);
              
              // Cargar los items de la venta
              tx.executeSql(
                'SELECT * FROM sale_items WHERE sale_id = ?',
                [saleId],
                (_, { rows: itemRows }) => {
                  const items = itemRows._array;
                  resolve({
                    ...sale,
                    items,
                  });
                },
                (_, error) => {
                  console.error('Error al cargar items de venta:', error);
                  resolve({ ...sale, items: [] });
                  return false;
                }
              );
            },
            (_, error) => {
              console.error('Error al cargar detalles de venta:', error);
              reject(error);
              return false;
            }
          );
        });
      });
      
      set({ isLoading: false });
      return sale;
    } catch (error: any) {
      console.error('Error al cargar detalles de venta:', error);
      set({ isLoading: false, error: error.message });
      return null;
    }
  },

  // Sincronizar ventas pendientes con el servidor
  syncPendingSales: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        throw new Error('No estás autenticado');
      }
      
      // Verificar conexión a internet
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        throw new Error('No hay conexión a internet');
      }
      
      // Buscar ventas no sincronizadas
      await new Promise<void>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            'SELECT * FROM sales WHERE sync_status = 0',
            [],
            async (_, { rows }) => {
              const unsyncedSales = rows._array;
              
              if (unsyncedSales.length === 0) {
                resolve();
                return;
              }
              
              // Sincronizar cada venta
              for (const sale of unsyncedSales) {
                try {
                  // Obtener los items de la venta
                  const items = await new Promise<SaleItem[]>((resolveItems, rejectItems) => {
                    tx.executeSql(
                      'SELECT * FROM sale_items WHERE sale_id = ?',
                      [sale.id],
                      (_, { rows: itemRows }) => {
                        resolveItems(itemRows._array);
                      },
                      (_, error) => {
                        console.error('Error al cargar items para sincronizar:', error);
                        rejectItems(error);
                        return false;
                      }
                    );
                  });
                  
                  // Enviar la venta al servidor
                  const response = await fetch(`${API_URL}/sales`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      date: sale.date,
                      total: sale.total,
                      payment_method: sale.payment_method,
                      notes: sale.notes,
                      items: items.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price: item.price,
                      })),
                    }),
                  });
                  
                  if (!response.ok) {
                    throw new Error('Error al sincronizar venta con el servidor');
                  }
                  
                  const serverSale = await response.json();
                  
                  // Actualizar el estado de sincronización
                  await new Promise<void>((resolveUpdate, rejectUpdate) => {
                    tx.executeSql(
                      'UPDATE sales SET server_id = ?, sync_status = 1 WHERE id = ?',
                      [serverSale.id, sale.id],
                      () => resolveUpdate(),
                      (_, error) => {
                        console.error('Error al actualizar estado de sincronización de venta:', error);
                        rejectUpdate(error);
                        return false;
                      }
                    );
                  });
                } catch (saleError) {
                  console.error('Error al sincronizar venta individual:', saleError);
                  // Continuar con la siguiente venta
                }
              }
              
              resolve();
            },
            (_, error) => {
              console.error('Error al buscar ventas no sincronizadas:', error);
              reject(error);
              return false;
            }
          );
        });
      });
    } catch (error) {
      console.error('Error general en sincronización de ventas:', error);
    }
  },
}));