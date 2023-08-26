const Community = require('../models/communityModel');
const Comment = require('../models/commentModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const cloudinary = require("../utils/cloudinary");

exports.addPost = catchAsync(async (req, res, next) => {
    const userId = req.user.id

    const  { post } = req.body;

    const userPost = await Community.create({
        post,
        user: userId
    })

    res.status(200).json({
        status: 'success',
        data: {
            userPost
        }
    })
});

const addPostPhoto = catchAsync(async (req, res, next) => {
    const postId = req.params.id

    const userPost = await Community.findById(postId)

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${userPost.user._id}-${Math.random() * 10000000000}/${userPost.user._id}Photo`,
        folder: 'posts',
        resource_type: 'image',
    });

    if (!result) {
        return next(new AppError('Something went wrong with the image upload', 400));
    }

    const updatedPost = await Community.findByIdAndUpdate(postId, {
        postPhoto: result.secure_url,
        cloudinaryId: result.public_id,
    });
});

const deletePostPhoto = catchAsync(async (req, res, next) => {
    const postId = req.params.id

    const userPost = await Community.findById(postId)

    await cloudinary.uploader.destroy(userPost.cloudinaryId);

    const updatedUserPost = await Com.findByIdAndUpdate(postId, {
        postPhoto: null,
        cloudinaryId: null,
    });

    res.status(200).json({
        status: 'success',
        data: {
            updatedUserPost
        }
    })
});


exports.editPost = catchAsync(async (req, res, next) => {
    const postId = req.params.id

    const userPost = await Community.findById(postId)

    if (req.file) {
        await deletePostPhoto(req, res, next);
        await addPostPhoto(req, res, next);
    }

    const updatedUserPost = await Community.findByIdAndUpdate(postId, {
        post: req.body.post
    });

    res.status(200).json({
        status: 'success',
        data: {
            updatedUserPost
        }
    })
});

exports.deletePost = catchAsync(async (req, res, next) => {
    const postId = req.params.id

    const userPost = await Community.findById(postId)

    if (userPost.cloudinaryId) {
        await deletePostPhoto(req, res, next);
    }

    await Community.findByIdAndDelete(postId);

    res.status(200).json({
        status: 'success',
        data: null
    })
});

exports.likePost = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const postId = req.params.id;

    const userPost = await Community.findById(postId);

    if (userPost.likes.find(e => e.id === userId)) {
        await Community.findByIdAndUpdate(postId, {
            $push : { likes: userId }
        })
    } else {
        await Community.findByIdAndUpdate(postId, {
            $pull : { likes: userId }
        })
    }

    res.status(200).json({
        status: 'success',
    })
})


exports.addComment = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const postId = req.params.id;

    const post = await Community.findById(postId);

    if (!post) {
       return next(new AppError('No post found with that ID', 404));
    }

    const comment = await Comment.create({
        comment: req.body.comment,
        user: userId,
    })

    await Community.findByIdAndUpdate(postId, {
        $push: { Comments: comment._id }
    })
})