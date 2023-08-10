const express = require('express');

const authConteoller = require('../controllers/authController');
const bookingSalonController = require('../controllers/salonBookingController');

const router = express.Router();

router
    .route('/')
    .get(
        authConteoller.protect,
        authConteoller.restrictTo('admin', 'salon service'),
        bookingSalonController.getAllSalonBookings
    )

module.exports = router;

