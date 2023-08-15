const express = require('express');

const consultationController = require('../controllers/consultationController');
const authController = require('../controllers/authController');

const router = express.Router();

router
    .route('/')
    .get(consultationController.getAllConsultations)
    .post(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.createConsultationProfile
    );

router
    .route('search/:key')
    .get(consultationController.searchConsultations)



router
    .route('/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.updateConsultationProfile
    )

router
    .route('/service')
    .post(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.addServices
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteService
    )



router
    .route('/service-photo/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.addServicesPhoto
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteservicePhoto
    )

router
    .route('certificate')
    .post(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.addCertificate
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteCertificate
    )

router
    .route('/certificate-photo/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.addCertificatePhoto
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteCertificatePhoto
    )

router
    .route('/course')
    .post(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.addCourse
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteCourse
    )

router
    .route('/course-photo/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.addCoursePhoto
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteCoursePhoto
    )

module.exports = router;