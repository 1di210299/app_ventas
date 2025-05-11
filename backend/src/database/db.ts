import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Asegurar que el directorio de la base de datos existe
const dbDir = path.resolve(__dirname, '../../db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Conexión a la base de datos
const db = new sqlite3.Database(path.join(dbDir, 'ventafacil.db'), (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  } else {
    console.log('Conexión exitosa a la base de datos SQLite');
  }
});

// Inicializar base de datos con tablas
const initializeDatabase = (): void => {
  db.serialize(() => {
    // Tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT,
      business_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de productos
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      cost REAL,
      stock INTEGER DEFAULT 0,
      image TEXT,
      barcode TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Tabla de ventas
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total REAL NOT NULL,
      payment_method TEXT,
      notes TEXT,
      sync_status INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Tabla de detalles de venta
    db.run(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    console.log('Base de datos inicializada correctamente');
  });
};

export { db, initializeDatabase };