const express = require('express');

const ConsultationReviewController = require('../controllers/consultationReviewController');
const authController = require('../controllers/authController');


const router = express.Router({ mergeParams: true });

router
    .route('/')
    .get(ConsultationReviewController.getAllReviews)

router
    .route('/:id')
    .post(
        authController.protect,
        ConsultationReviewController.setConsultationUserIds,
        ConsultationReviewController.createReview
    )
    .get(ConsultationReviewController.getReview)
    .patch(
        authController.protect,
        ConsultationReviewController.updateReview
    )
    .delete(
        authController.protect,
        ConsultationReviewController.deleteReview
    )

module.exports = router;