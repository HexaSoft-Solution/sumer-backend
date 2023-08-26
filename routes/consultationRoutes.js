const express = require('express');

const consultationController = require('../controllers/consultationController');
const authController = require('../controllers/authController');

const upload = require('../utils/multer');

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
    .route('/search')
    .get(consultationController.searchConsultations)

router
    .route('/my-profile')
    .get(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.getMyProfile
    )

router
    .route('/:id')
    .get(consultationController.getConsultantation)
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.updateConsultationProfile
    )
    .put(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.endConsultant
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteConsultation
    )

router
    .route('/service')
    .post(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        upload.single('image'),
        consultationController.addServices
    )

router
    .route('/service/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.editService
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
        upload.single('image'),
        consultationController.addServicesPhoto
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteservicePhoto
    )

router
    .route('/certificate')
    .post(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        upload.single('image'),
        consultationController.addCertificate
    )

router
    .route('/certificate/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.editCertificate
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
        upload.single('image'),
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
        upload.single('image'),
        consultationController.addCourse
    )


router
    .route('/course/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.editCourse
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
        upload.single('image'),
        consultationController.addCoursePhoto
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteCoursePhoto
    )

router
    .route('/active-consultant/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin'),
        consultationController.activeConsultation
    )

router
    .route('/view-consultation/:id')
    .get(
        authController.protect,
        consultationController.viewConsultation
    )

router
    .route('/message/:id')
    .patch(
        authController.protect,
        consultationController.editMessage
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteMessage
    )

router
    .route('/consultant-send-message/:id')
    .post(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.consultationSendChat
    )

router
    .route('/user-send-message/:id')
    .post(
        authController.protect,
        consultationController.userSendChat
    )

module.exports = router;