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
    .route('/my-profile')
    .get(
        authController.protect,
        authController.restrictTo('consultant'),
        consultationController.getMyProfile
    )

    router
        .route('/consltant')
        .get(consultationController.getAllConsultant)

router
    .route('/search')
    .get(consultationController.searchConsultations)

router
    .route('/my-consultation')
    .get(
        authController.protect,
        authController.restrictTo('consultant'),
        consultationController.getMyConsultation
    )

router
    .route('/:id')
    .get(consultationController.getConsultantation)
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.updateConsultationProfile
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.deleteConsultation
    )

router
    .route('/end-consultant/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'consultant'),
        consultationController.endConsultant
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
    .route('/edit-question/:id')
    .patch(
        authController.protect,
        consultationController.editQuestion
    )

router
    .route('/delete-consultant/:id')
    .delete(
        authController.protect,
        consultationController.deleteConsultant
    )

router
    .route('/create-consultant/:id')
    .post(
        authController.protect,
        consultationController.createConsultantTicket
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