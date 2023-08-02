const express = require('express');

const salonReviewController = require('../controllers/salonReviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router
    .route('/')
    .get(
        authController.protect,
        salonReviewController.getAllSalonReviews
    )
    .post(
        authController.protect,
        salonReviewController.setSalonUserIds,
        salonReviewController.createSalonReview
    );


router
    .route('/:id')
    .get(salonReviewController.getSalonReview)
    .patch(
        authController.protect,
        salonReviewController.updateSalonReview
    )
    .delete(
        authController.protect,
        salonReviewController.deleteSalonReview
    )

module.exports = router;