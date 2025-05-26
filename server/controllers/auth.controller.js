import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import { sendVerificationEmail } from '../utils/sendEmail.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const signup = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(errorHandler(400, 'Account exists! Please sign in.'));
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);
    const newUser = new User({ email, password: hashedPassword });

    await newUser.save();

    const verificationToken = jwt.sign(
      { id: newUser._id },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(email, verificationUrl);

    res.status(201).json('User created successfully! Please check your email to verify your account.');
  } catch (error) {
    next(error);
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  console.log('Signin attempt:', { email });

  try {
    const validUser = await User.findOne({ email });
    console.log('User found:', validUser ? 'yes' : 'no');

    if (!validUser) return next(errorHandler(404, 'User not found!'));

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    console.log('Password valid:', validPassword ? 'yes' : 'no');

    if (!validPassword) return next(errorHandler(401, 'Wrong credentials!'));

    if (!validUser.verified) {
      return next(errorHandler(403, 'Please verify your email before signing in.'));
    }

    const token = jwt.sign({ id: validUser._id }, JWT_SECRET);
    const { password: pass, ...rest } = validUser._doc;

    return res
      .cookie('access_token', token, { httpOnly: true })
      .status(200)
      .json(rest);
  } catch (error) {
    console.error('Signin error:', error);
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

export const verifyEmail = async (req, res, next) => {
  const token = req.query.token;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verified) {
      return res.status(200).json({ message: 'User already verified' });
    }

    user.verified = true;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};