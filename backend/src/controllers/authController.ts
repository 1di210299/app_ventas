import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { IUser } from '../types';

// Generar JWT
const generateToken = (id: number): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'ventafacil_secret_key', {
    expiresIn: '30d'
  });
};

// @desc    Registrar un nuevo usuario
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, business_name } = req.body;
    
    // Verificar campos requeridos
    if (!name || !email || !password) {
      res.status(400).json({ message: 'Por favor complete todos los campos obligatorios' });
      return;
    }
    
    // Verificar si el usuario ya existe
    const userExists = await User.findByEmail(email);
    if (userExists) {
      res.status(400).json({ message: 'El usuario ya existe' });
      return;
    }
    
    // Crear usuario
    const user = await User.create({
      name,
      email,
      password,
      business_name
    });
    
    // Enviar respuesta con token
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      business_name: user.business_name,
      token: generateToken(user.id as number)
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
};

// @desc    Autenticar usuario y obtener token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Verificar email
    const user = await User.findByEmail(email);
    
    // Verificar si el usuario existe y la contraseña coincide
    if (user && (await bcrypt.compare(password, user.password as string))) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        business_name: user.business_name,
        token: generateToken(user.id as number)
      });
    } else {
      res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

// @desc    Obtener perfil de usuario
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

// @desc    Actualizar perfil de usuario
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, business_name } = req.body;
    
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }
    
    // Actualizar usuario
    const updatedUser = await User.update(req.user.id, {
      name: name || req.user.name,
      email: email || req.user.email,
      business_name: business_name || req.user.business_name
    });
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error al actualizar perfil' });
  }
};