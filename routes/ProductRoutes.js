const express = require("express");
const ProductController = require("../controllers/ProductController");
const authController = require("../controllers/authController");
const upload = require("../utils/multer");

const router = express.Router();

router
  .route("/")
  .get(
    // authController.protect,
    ProductController.getAllProducts
  )
  .post(
    authController.protect,
    authController.restrictTo("admin", "business"),
    ProductController.createProduct
  );

router
  .route("/cart")
  .patch(authController.protect, ProductController.addToCart)
  .delete(authController.protect, ProductController.removeFromCart);

  router
  .route("/my-products")
  .get(
    authController.protect,
    authController.restrictTo("business"),
    ProductController.getMyProduct
  );

router
  .route('/invoices')
  .get(
    authController.protect,
    ProductController.getIvoices
  )

router
  .route('/transactions')
  .get(ProductController.getAllTransactions)
  
  router
  .route('/invoices')
  .get(ProductController.getAllInvoices)

router.route("/search").get(ProductController.searchProduct);

router
  .route("/:id")
  .get(ProductController.getProduct)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "business"),
    ProductController.updateProduct
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin", "business"),
    ProductController.deleteProduct
  );

router
  .route("/uploadProductPhoto/:id")
  .patch(
    upload.single("image"),
    authController.protect,
    authController.restrictTo("admin", "business"),
    ProductController.uploadPhoto
  );

router
  .route("/uploadMultipleProductPhoto/:id")
  .patch(
    upload.array("imageArray", 5),
    authController.protect,
    authController.restrictTo("admin", "business"),
    ProductController.uploadMultiplePhoto
  );

router
  .route("/deleteMultipleProductPhoto/:id/:imageId")
  .delete(
    authController.protect,
    authController.restrictTo("admin", "business"),
    ProductController.deleteMultiplePhoto
  );
router
  .route("/loved/:id")
  .patch(authController.protect, ProductController.loveProduct);

router
  .route("/unloved/:id")
  .patch(authController.protect, ProductController.unloveProduct);

module.exports = router;
