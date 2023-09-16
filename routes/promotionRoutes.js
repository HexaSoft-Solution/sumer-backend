const express = require('express');

const promotionController = require('../controllers/promotionController');
const authController = require('../controllers/authController');


const router = express.Router();

router
    .route('/')
    .get(promotionController.getAllPromotion)
    .post(
        authController.protect,
        authController.restrictTo('admin'),
        promotionController.createPromotion
    )

router
    .route('/:id')
    .get(promotionController.getPromotion)
    .patch(
        authController.protect,
        authController.restrictTo('admin'),
        promotionController.updatePromotion
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin'),
        promotionController.deletePromotion
    )

module.exports = router;