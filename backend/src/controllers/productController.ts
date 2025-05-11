import { Request, Response } from 'express';
import Product from '../models/Product';
import { IProduct } from '../types';

// @desc    Obtener todos los productos
// @route   GET /api/products
// @access  Private
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const products = await Product.getAll(req.user.id);
    res.json(products);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
};

// @desc    Obtener un producto por ID
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const productId = parseInt(req.params.id);
    const product = await Product.getById(productId, req.user.id);
    
    if (!product) {
      res.status(404).json({ message: 'Producto no encontrado' });
      return;
    }
    
    res.json(product);
  } catch (error) {
    console.error(`Error al obtener producto ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al obtener producto' });
  }
};

// @desc    Buscar productos
// @route   GET /api/products/search
// @access  Private
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const query = req.query.q as string;
    
    if (!query || query.trim() === '') {
      res.status(400).json({ message: 'Se requiere un término de búsqueda' });
      return;
    }
    
    const products = await Product.search(query, req.user.id);
    res.json(products);
  } catch (error) {
    console.error('Error al buscar productos:', error);
    res.status(500).json({ message: 'Error al buscar productos' });
  }
};

// @desc    Crear un nuevo producto
// @route   POST /api/products
// @access  Private
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const { name, description, price, cost, stock, image, barcode } = req.body;
    
    // Validación básica
    if (!name || !price) {
      res.status(400).json({ message: 'Nombre y precio son campos requeridos' });
      return;
    }
    
    const productData: IProduct = {
      user_id: req.user.id,
      name,
      description,
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : undefined,
      stock: stock ? parseInt(stock) : 0,
      image,
      barcode
    };
    
    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ message: 'Error al crear producto' });
  }
};

// @desc    Actualizar un producto
// @route   PUT /api/products/:id
// @access  Private
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const productId = parseInt(req.params.id);
    const { name, description, price, cost, stock, image, barcode } = req.body;
    
    // Verificar que el producto exista y pertenezca al usuario
    const existingProduct = await Product.getById(productId, req.user.id);
    if (!existingProduct) {
      res.status(404).json({ message: 'Producto no encontrado' });
      return;
    }
    
    const productData: Partial<IProduct> = {
      name,
      description,
      price: price ? parseFloat(price) : undefined,
      cost: cost ? parseFloat(cost) : undefined,
      stock: stock !== undefined ? parseInt(stock) : undefined,
      image,
      barcode
    };
    
    const updatedProduct = await Product.update(productId, productData, req.user.id);
    res.json(updatedProduct);
  } catch (error) {
    console.error(`Error al actualizar producto ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al actualizar producto' });
  }
};

// @desc    Actualizar stock de un producto
// @route   PATCH /api/products/:id/stock
// @access  Private
export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const productId = parseInt(req.params.id);
    const { quantity } = req.body;
    
    if (quantity === undefined) {
      res.status(400).json({ message: 'Se requiere especificar la cantidad' });
      return;
    }
    
    // Verificar que el producto exista y pertenezca al usuario
    const existingProduct = await Product.getById(productId, req.user.id);
    if (!existingProduct) {
      res.status(404).json({ message: 'Producto no encontrado' });
      return;
    }
    
    const result = await Product.updateStock(productId, parseInt(quantity), req.user.id);
    res.json(result);
  } catch (error) {
    console.error(`Error al actualizar stock del producto ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al actualizar stock' });
  }
};

// @desc    Eliminar un producto
// @route   DELETE /api/products/:id
// @access  Private
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    const productId = parseInt(req.params.id);
    
    // Verificar que el producto exista y pertenezca al usuario
    const existingProduct = await Product.getById(productId, req.user.id);
    if (!existingProduct) {
      res.status(404).json({ message: 'Producto no encontrado' });
      return;
    }
    
    const result = await Product.delete(productId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error(`Error al eliminar producto ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error al eliminar producto' });
  }
};