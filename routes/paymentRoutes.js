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
    .route('/paymentConnection/:user')
    .patch(
        paymentController.verifyBuyConnection
    )


router
    .route('/bookSalon')
    .patch(
        authController.protect,
        paymentController.salonBooking
    );

router
    .route('/verifyPaymentSalon/:bookingId')
    .get(
        paymentController.verifyBookingSalon
    );

router
    .route('/create-consultation-profile')
    .post(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        paymentController.createConsultantProfilePayment
    );
router
    .route('/verifyPaymentCreateConsultation/:user')
    .get(
        paymentController.verifyCreateConsultationProfile
    );

router
    .route('/buy-consultant-connection')
    .patch(
        authController.protect,
        paymentController.consultationContectionsPayment
    );

router
    .route('/verifyPaymentConsultationConnection/:id/:user')
    .get(
        paymentController.verifyBuyingConsultationsConnection
    );

router
    .route('/buy-consultation-ticket')
    .patch(
        authController.protect,
        paymentController.buyConsultantTicket
    );


router
    .route('/verify-buying-consultation-ticket/:id/:user/:title')
    .get(
        paymentController.verifyBuyingConsultationsTicket
    );

module.exports = router;