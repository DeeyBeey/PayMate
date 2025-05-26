const express = require('express');
const { signup, signin, google, signOut, verifyEmail } = require('../controllers/auth.controller.js');

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/google', google); 
router.get('/signout', signOut);
router.get('/verify-email', verifyEmail);

module.exports = router;