const express = require("express");

const withdrawController = require("../controllers/withdrawController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router
    .route("/")
    .get(
        authController.restrictTo("admin"),
        withdrawController.getAllRequestes
    )

router
    .route("/create")
    .post(
        withdrawController.createWithdrawRequest
    )

router
    .route("/approve/:id")
    .patch(
        authController.restrictTo("admin"),
        withdrawController.acceptRequest
    )

router
    .route("/reject/:id")
    .patch(
        authController.restrictTo("admin"),
        withdrawController.rejectWithdrawRequest
    )

module.exports = router;