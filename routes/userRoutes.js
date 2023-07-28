const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const upload = require('../utils/multer');


const router = express.Router();

router.param('id', (req, res, next, val) => {
    console.log(`user id ${val}`)
    next();
})

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/loginPhone', authController.loginMobile);
router.post('/loginUsername', authController.loginUsername);
router.get('/logout', authController.logout);
router.get('/isLoggedIn',
    authController.protect,
    authController.isLoggedIn
);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/verifyOTPForgetPassword/:OTP', authController.verifyForgetPasswordOTP)
router.patch('/resetPassword/:token', authController.resetPassword);

router.patch('/sendVerifyEmail', authController.resendVerifyOTPEmail);
router.post('/verifyEmail/:OTP', authController.verifyEmail);
// router.use(authController.protect);

router.patch(
    '/updateMyPassword',
    authController.protect,
    authController.updatePassword
);

router.get(
    '/me',
    authController.protect,
    userController.getMe,
    userController.getUser
);
router.patch(
    '/updateMyPassword',
    authController.protect,
    authController.updatePassword
);
router.patch(
    '/updateMe',
    authController.protect,
    userController.updateMe
);
router.delete(
    '/deleteMe',
    authController.protect,
    userController.deleteMe
);


router
    .route('/uploadPersonalPhoto')
    .patch(
        upload.single('image'),
        authController.protect,
        userController.uploadPersonalPhoto
    )

router
    .route('/')
    .get(
        authController.protect,
        authController.restrictTo('admin'),
        userController.getUsers
    )
    .post(userController.createUser);


router
    .route('/:id')
    .get(userController.getUser)
    .patch(
        authController.protect,
        authController.restrictTo('admin'),
        userController.updateUser
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin'),
        userController.deleteUser
    );

router
    .post(
        '/address',
        authController.protect,
        userController.addAddress
    )
    .delete(
        '/address/:addressId',
        authController.protect,
        userController.deleteAddress
    )

module.exports = router;
