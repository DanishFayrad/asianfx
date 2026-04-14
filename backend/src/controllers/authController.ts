import type { Request, Response } from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user: any = await User.create({
      name,
      email,
      password: hashedPassword,
      is_email_verified: true // Setting true for now as we don't have email service setup, following user's usual flow
    });

    return res.status(201).json({ message: 'User registered successfully', user_id: user.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user: any = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpire = process.env.JWT_EXPIRE;
    
    if (!jwtSecret) throw new Error('JWT_SECRET not defined');

    const token = jwt.sign(
      { user_id: user.id, is_admin: user.is_admin },
      jwtSecret,
      { expiresIn: jwtExpire as any || '2h' }
    );

    return res.status(200).json({ access_token: token, token_type: 'bearer', message: 'Login successful' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};
