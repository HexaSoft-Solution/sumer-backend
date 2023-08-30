const express = require('express');

const communityController = require('../controllers/communityController');
const authController = require('../controllers/authController');

const upload = require('../utils/multer');

const router = express.Router();

router
    .route('/posts')
    .get(communityController.getAllPosts)
    .post(
        authController.protect,
        communityController.addPost
    );

router
    .route('/posts/:id/comments')
    .get(
        authController.protect,
        communityController.postsComments
    );

router
    .route('/posts/add-photo/:id')
    .patch(
        authController.protect,
        upload.single('photo'),
        communityController.addPostPhoto
    );

router
    .route('/my-posts')
    .get(
        authController.protect,
        communityController.myPosts
    );

router
    .route('/delete-photo/:id')
    .patch(
        authController.protect,
        communityController.deletePostPhoto
    );

router
    .route('/posts/like/:id')
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
    .route('/posts/:id')
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