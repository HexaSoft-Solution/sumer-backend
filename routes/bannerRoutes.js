const express = require("express");
const bannerController = require("../controllers/bannerController");
const authController = require("../controllers/authController");
const upload = require("../utils/multer");

const router = express.Router();

router
    .route('/')
    .get(bannerController.getAllBanners)
    .post(
        authController.protect,
        authController.restrictTo('admin'),
        upload.single('image'),
        bannerController.createBanner
    )

router
    .route('/banner-photo/:cloudinary_id')
    .patch(
        authController.protect,
        authController.restrictTo('admin'),
        upload.single('image'),
        bannerController.updateBannerPhoto
    )

router
    .route('/:id')
    .patch(
        authController.protect,
        authController.restrictTo('admin'),
        bannerController.updateBanner
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin'),
        bannerController.deleteBanner
    )

module.exports = router;