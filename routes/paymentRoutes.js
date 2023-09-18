const express = require('express');

const paymentController = require('../controllers/paymentController');
const paymentShreifController = require('../controllers/paymentShreifController');
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
    .route('/sherif/checkout')
    .patch(
        authController.protect,
        paymentShreifController.checkout
    );

router
    .route('/paymentCallback/:invoice_id')
    .get(
        paymentController.paymentCallback
    );

router
    .route('/checkPayment/:invoice_id')
    .get(
        paymentController.checkPayment
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
    .route('/sherif/bookSalon')
    .patch(
        authController.protect,
        paymentShreifController.salonBooking
    );

router
    .route('/verifyPaymentSalon/:bookingId/:amount/:salonId/:user')
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
    .route('/sherif/buy-consultation-ticket')
    .patch(
        authController.protect,
        paymentShreifController.buyConsultantTicket
    )

router
    .route('/verify-buying-consultation-ticket/:userId/:consult/:title')
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
    .route('/verify-promoting-product/:productId/:amount/:planId')
    .get(paymentController.verifyPromoteProduct)

router
    .route('/promote-salon')
    .patch(
        authController.protect,
        paymentController.promoteSalon
    );

router
    .route('/verify-promoting-salon/:salonId/:amount/:planId')
    .get(paymentController.verifyPromoteSalon)

router
    .route('/promote-consultation')
    .patch(
        authController.protect,
        paymentController.promoteConsultation
    );

router
    .route('/verify-promoting-consultation/:consultationId/:amount/:planId')
    .get(paymentController.verifyPromoteConsultation)

router
    .route('/paypal/checkout-cart')
    .post(
        authController.protect,
        paymentController.paypalCheckoutOrder
    )

router
    .route('/paypal/check-order-status/:orderID')
    .get(paymentController.getOrderStatus)

router
.route('/paypal/checkout-book-salon')
    .post(
        authController.protect,
        paymentController.paypalBookSalon
    )

router
    .route('/paypal/check-book-salon-status/:orderID')
    .get(paymentController.getPaypalSalonBookingStatus)

router
.route('/paypal/checkout-book-consulataion')
    .post(
        authController.protect,
        paymentController.paypalConsultationBook
    )

router
    .route('/paypal/check-book-consulataion-status/:orderID')
    .get(paymentController.getPaypalConsultationBookingStatus)

router
    .route('/paypal/promote-product')
    .post(
        authController.protect,
        paymentController.promoteProductPaypal
    )

router
    .route('/paypal/check-promote-product-status/:orderID')
    .get(paymentController.promoteProductCheckStatusPaypal)

router
    .route('/paypal/promote-salon')
    .post(
        authController.protect,
        paymentController.promoteSalonPaypal
    )

router
    .route('/paypal/check-promote-salon-status/:orderID')
    .get(paymentController.promoteSalonCheckStatusPaypal)

router
    .route('/paypal/promote-consultation')
    .post(
        authController.protect,
        paymentController.promoteConsultationPaypal
    )

router
    .route('/paypal/check-promote-consultation-status/:orderID')
    .get(paymentController.promoteConsultationCheckStatusPaypal)

module.exports = router;