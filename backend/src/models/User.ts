import { db } from '../database/db';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

class User {
  // Buscar usuario por email
  static findByEmail(email: string): Promise<IUser | undefined> {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, user: IUser) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      });
    });
  }

  // Buscar usuario por ID
  static findById(id: number): Promise<IUser | undefined> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name, email, business_name, created_at FROM users WHERE id = ?', 
        [id], 
        (err, user: IUser) => {
          if (err) {
            reject(err);
          } else {
            resolve(user);
          }
        }
      );
    });
  }

  // Crear nuevo usuario
  static async create(userData: IUser): Promise<IUser> {
    const { name, email, password, business_name } = userData;
    
    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password as string, salt);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (name, email, password, business_name) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, business_name],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              id: this.lastID, 
              name, 
              email, 
              business_name 
            });
          }
        }
      );
    });
  }

  // Actualizar usuario
  static update(id: number, userData: Partial<IUser>): Promise<IUser> {
    const { name, email, business_name } = userData;
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET name = ?, email = ?, business_name = ? WHERE id = ?',
        [name, email, business_name, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              id, 
              name: name as string, 
              email: email as string, 
              business_name 
            });
          }
        }
      );
    });
  }
}

export default User;