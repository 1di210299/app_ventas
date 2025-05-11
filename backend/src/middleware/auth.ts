import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUser } from '../types';
import User from '../models/User';

// Extendemos la interfaz Request para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// Middleware para proteger rutas
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;
  
  // Verificar si existe el header de autorización y comienza con Bearer
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obtener token del header
      token = req.headers.authorization.split(' ')[1];
      
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { id: number };
      
      // Obtener usuario del token ID
      const user = await User.findById(decoded.id);
      if (!user) {
        res.status(401).json({ message: 'Usuario no encontrado' });
        return;
      }
      
      // Agregar usuario al objeto request
      req.user = user;
      next();
    } catch (error) {
      console.error('Error de autenticación:', error);
      res.status(401).json({ message: 'No autorizado, token inválido' });
    }
  } else {
    res.status(401).json({ message: 'No autorizado, no se proporcionó token' });
  }
};