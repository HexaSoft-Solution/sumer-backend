const express = require('express');

const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

router
    .route('/cart')
    .get(
        authController.protect,
        paymentController.viewCart
    );

router
    .route('/checkout')
    .patch(
        authController.protect,
        paymentController.checkout
    );

router
    .route('/paymentCallback/:invoice_id')
    .get(
        paymentController.paymentCallback
    );


router
    .route('/buyProductConnection')
    .patch(
        authController.protect,
        authController.restrictTo('admin', "business"),
        paymentController.buyProductConnections
    );

router
    .route('/paymentConnection')
    .patch(
        authController.protect,
        paymentController.verifyBuyConnection
    )

module.exports = router;