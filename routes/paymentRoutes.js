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
    .route('/voucher')
    .post(
        authController.protect,
        paymentController.addVoucher
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
    .route('/verifyPaymentSalon/:bookingId/:amount/:salonId')
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
    .route('/verifyPaymentConsultationConnection/:consult/:user')
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
    .route('/verify-buying-consultation-ticket/:id/:consult')
    .get(
        paymentController.verifyBuyingConsultationsTicket
    );

router
    .route('/promote-product')
    .patch(
        authController.protect,
        paymentController.promoteProduct
    );

router
    .route('/verify-promoting-product/:productId/:amount')
    .get(paymentController.verifyPromoteProduct)

router
    .route('/promote-salon')
    .patch(
        authController.protect,
        paymentController.promoteSalon
    );

router
    .route('verify-promoting-salon/:salonId/:amount')
    .get(paymentController.verifyPromoteSalon)

router
    .route('/promote-consultation')
    .patch(
        authController.protect,
        paymentController.promoteConsultation
    );

router
    .route('verify-promoting-consultation/:consultationId/:amount')
    .get(paymentController.verifyPromoteConsultation)

router
    .route('/paypal/orders')
    .get(
        paymentController.paypalMgmg
    )

router
    .route('/paypal/success')
    .get(
        paymentController.paypalSuccess
    );


module.exports = router;