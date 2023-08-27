const express = require('express');

const communityController = require('../controllers/communityController');
const authController = require('../controllers/authController');

const upload = require('../utils/multer');

const router = express.Router();

router
    .route('/')
    .get(communityController.getAllPosts)
    .post(
        authController.protect,
        communityController.getAllPosts
    );

router
    .route('/add-photo/:id')
    .patch(
        authController.protect,
        upload.single('photo'),
        communityController.addPostPhoto
    );

router
    .route('/delete-photo/:id')
    .patch(
        authController.protect,
        communityController.deletePostPhoto
    );

router
    .route('/like/:id')
    .patch(
        authController.protect,
        communityController.likePost
    );

router
    .route('/comment/:id')
    .post(
        authController.protect,
        communityController.addComment
    )
    .patch(
        authController.protect,
        communityController.editComment
    )
    .delete(
        authController.protect,
        communityController.deleteComment
    );


router
    .route('/comment/photo/:id')
    .patch(
        authController.protect,
        upload.single('photo'),
        communityController.addCommentPhoto
    )
    .delete(
        authController.protect,
        communityController.deleteCommentPhoto
    )

router
    .route('/comment/like/:id')
    .patch(
        authController.protect,
        communityController.likeComment
    );

router
    .route('/:id')
    .get(communityController.getPost)
    .patch(
        authController.protect,
        communityController.editPost
    )
    .delete(
        authController.protect,
        communityController.deletePost
    );

module.exports = router;