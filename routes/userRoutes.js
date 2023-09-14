const express = require("express");
const passport = require("passport");

const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const upload = require("../utils/multer");

const router = express.Router();

router.param("id", (req, res, next, val) => {
  console.log(`user id ${val}`);
  next();
});


router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/loginPhone", authController.loginMobile);
router.post("/loginUsername", authController.loginUsername);
router.get("/logout", authController.logout);
router.get("/isLoggedIn", authController.protect, authController.isLoggedIn);

router.get(
  "/auth/google/signin", 
  passport.authenticate('google', { 
    failureRedirect: '/' ,
    scope: "email",
  }),
  );

  router.get(
    "/auth/google/callback",
    authController.googleAuth
  );


  router.get(
    "/auth/facebook/signin",
    passport.authenticate('facebook', { 
      failureRedirect: '/' ,
      scope: ["profile", "email"],
    }),
    authController.facebookAuth
  );


  router.get(
    "/auth/facebook/callback",
    authController.googleAuth
  );

router.post("/forgotPassword", authController.forgotPassword);
router.patch(
  "/verifyOTPForgetPassword/:OTP",
  authController.verifyForgetPasswordOTP
);
router.patch("/resetPassword/:token", authController.resetPassword);

router.patch("/sendVerifyEmail", authController.resendVerifyOTPEmail);
router.post("/verifyEmail/:OTP", authController.verifyEmail);
// router.use(authController.protect);

router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updatePassword
);

router.get(
    '/my-profile',
    authController.protect,
    userController.myProfile
)

router
  .route("/me")
  .get(authController.protect, userController.getMe, userController.getUser);

router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updatePassword
);
router.patch("/updateMe", authController.protect, userController.updateMe);
router.delete("/deleteMe", authController.protect, userController.deleteMe);
router
  .route("/address")
  .post(authController.protect, userController.addAddress);
router
  .route("/address/:addressId")
    .patch(authController.protect, userController.updateAddress)
    .delete(authController.protect, userController.deleteAddress);
router
  .route("/uploadPersonalPhoto")
  .patch(
    upload.single("image"),
    authController.protect,
    userController.uploadPersonalPhoto
  );

  router
    .route("/loved-product")
    .get(
      authController.protect,
      userController.getMyFavouriteProduct
    )

  router
    .route("/my-addressess")
    .get(
      authController.protect,
      userController.getMyAddress
    )

    router
      .route("/my-voucher")
      .get(
        authController.protect,
        userController.getMyVouvher
      )

router
  .route("/")
  .get(
    authController.protect,
    authController.restrictTo("admin"),
    userController.getUsers
  )
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    userController.updateUser
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    userController.deleteUser
  );

module.exports = router;
