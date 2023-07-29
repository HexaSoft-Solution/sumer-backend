const express = require('express');
const ProductController = require('../controllers/ProductController');
const authController = require('../controllers/authController');
const upload = require("../utils/multer");

const router = express.Router();

router
    .route('/')
    .get(ProductController.getAllProducts)
    .post(
        authController.protect,
        authController.restrictTo('admin', 'business'),
        ProductController.createProduct
    )

router
    .route('/:id')
    .get(ProductController.getProduct)
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'business'),
        ProductController.updateProduct
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'business'),
        ProductController.deleteProduct
    )

router
    .route('/search/:key')
    .get(ProductController.searchProduct);

router
    .route('/uploadProductPhoto/:id')
    .patch(
        upload.single('image'),
        authController.protect,
        authController.restrictTo('admin', 'business'),
        ProductController.uploadPhoto
    )

router
    .route('/uploadMultipleProductPhoto/:id')
    .patch(
        upload.single('image'),
        authController.protect,
        authController.restrictTo('admin', 'business'),
        ProductController.uploadMultiplePhoto
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'business'),
        ProductController.deleteMultiplePhoto
    )
router
    .route('/loved/:id')
    .patch(
        authController.protect,
        ProductController.loveProduct
    )
router
    .route('/unloved/:id')
    .patch(
        authController.protect,
        ProductController.unloveProduct
    )

module.exports = router;