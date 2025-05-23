import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const signup = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(errorHandler(400, 'Account exists! Please Sign in.'));
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);
    const newUser = new User({ email, password: hashedPassword });

    await newUser.save();
    res.status(201).json('User created successfully!');
  } catch (error) {
    next(error);
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  console.log('Signin attempt:', { email }); // Debug log
  try {
    const validUser = await User.findOne({ email });
    console.log('User found:', validUser ? 'yes' : 'no'); // Debug log
    if (!validUser) return next(errorHandler(404, 'User not found!'));

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    console.log('Password valid:', validPassword ? 'yes' : 'no'); // Debug log
    if (!validPassword) return next(errorHandler(401, 'Wrong credentials!'));

    console.log('JWT_SECRET exists:', !!JWT_SECRET); // Debug log
    const token = jwt.sign({ id: validUser._id }, JWT_SECRET);
    const { password: pass, ...rest } = validUser._doc;
    
    return res
      .cookie('access_token', token, { httpOnly: true })
      .status(200)
      .json(rest);
  } catch (error) {
    console.error('Signin error:', error); // Debug log
    next(error);
  }
};

export const google = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const token = jwt.sign({ id: user._id }, JWT_SECRET);
      const { password: pass, ...rest } = user._doc;
      return res
        .cookie('access_token', token, { httpOnly: true })
        .status(200)
        .json(rest);
    } else {
      const generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);
      const newUser = new User({
        email: req.body.email,
        password: hashedPassword,
        avatar: req.body.photo,
      });
      await newUser.save();
      const token = jwt.sign({ id: newUser._id }, JWT_SECRET);
      const { password: pass, ...rest } = newUser._doc;
      return res
        .cookie('access_token', token, { httpOnly: true })
        .status(200)
        .json(rest);
    }
  } catch (error) {
    next(error);
  }
};

export const signOut = async (req, res, next) => {
  try {
    res.clearCookie('access_token');
    res.status(200).json('User has been logged out!');
  } catch (error) {
    next(error);
  }
};