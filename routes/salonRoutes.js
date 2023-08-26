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
    .route('/search')
    .get(salonController.searchSalon);

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

module.exports = router;