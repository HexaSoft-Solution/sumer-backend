const express = require('express');

const salonController = require('../controllers/salonController');
const authController = require('../controllers/authController');

const upload = require("../utils/multer");

const router = express.Router();

router
    .route('/')
    .get(salonController.getAllSalons)
    .post(
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        salonController.createSalon
    )

router
    .route('/search')
    .get(salonController.searchSalon);

router
    .route('/:id')
    .get(salonController.getSalon)
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        salonController.updateSalon
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        salonController.deleteSalon
    )

router
    .route('/service')
    .post(
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        upload.single('image'),
        salonController.addServices
    )

router
    .route('/service/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        salonController.editService
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        salonController.deleteService
    )

router
    .route('/service-photo')
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        upload.single('image'),
        salonController.addServicesPhoto
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        salonController.deleteservicePhoto
    )

router
    .route('/uploadSalonPhoto/:id')
    .patch(
        upload.single('image'),
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        salonController.uploadPhoto
    )

router
    .route('/uploadServicePhoto/:id')
    .patch(
        upload.single('image'),
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        salonController.uploadServicePhoto
    )

router
    .route('/loved/:id')
    .patch(
        authController.protect,
        salonController.loveSalon
    )

router
    .route('/unloved/:id')
    .patch(
        authController.protect,
        salonController.unloveSalon
    )

router
    .route('/my-bookings')
    .get(
        authController.protect,
        salonController.getMyBookings
    )

router
    .route('/add-timetable')
    .post(
        authController.protect,
        authController.restrictTo('admin', 'salon service'),
        salonController.addTimeTable
    )

module.exports = router;