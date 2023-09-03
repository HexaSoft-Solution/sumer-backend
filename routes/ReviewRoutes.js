const express = require('express');

const reviewController = require('../controllers/ReviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router
    .route('/')
    .get(
        authController.protect,
        reviewController.getAllReviews
    )
    .post(
        authController.protect,
        reviewController.setProductUserIds,
        reviewController.createReview
    );

router
    .route('/:id')
    .get(reviewController.getReview)
    .patch(
        authController.protect,
        reviewController.updateReview
    )
    .delete(
        authController.protect,
        reviewController.deleteReview
    );

module.exports = router;
//