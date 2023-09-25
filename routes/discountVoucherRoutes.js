const express = require('express');

const discountVoucherController = require('../controllers/discountVoucherController');
const authController = require('../controllers/authController');

const router = express.Router();

router
    .route('/')
    .get(discountVoucherController.getAllVouchers)
    .post(
        authController.protect,
        authController.restrictTo('admin', "business", "salon service", "consultant"),
        discountVoucherController.createVoucher
    )

router
    .route('/:id')
    .get(discountVoucherController.getVoucher)
    .delete(
        authController.protect,
        authController.restrictTo('admin', "business"),
        discountVoucherController.deleteVoucher
    )

router
    .route('/addDiscountToProduct')
    .post(
        authController.protect,
        authController.restrictTo('admin', "business"),
        discountVoucherController.addDiscountToProduct
    )

router
    .route('/removeDiscountFromProduct/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin', "business"),
        discountVoucherController.removeDicountFromProduct
    )

router
    .route('/addVoucherToUser')
    .post(
        authController.protect,
        discountVoucherController.addVoucherToUser
    )

module.exports = router;