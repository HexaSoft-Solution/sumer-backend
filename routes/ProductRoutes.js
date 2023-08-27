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
    .route('/cart')
    .patch(
        authController.protect,
        ProductController.addToCart
    )
    .delete(
        authController.protect,
        ProductController.removeFromCart
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
    .route('/my-products')
    .get(authController.protect,
        authController.restrictTo('business'),
        ProductController.getMyProduct);

router
    .route('/search')
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