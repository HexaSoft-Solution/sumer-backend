const Review = require('../models/reviewModel');
const Product = require('../models/productModel');
const User = require("../models/userModel");

const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require("../utils/appError");
const factory = require('./handlerFactory');

exports.setProductUserIds = (req, res, next) => {
    if (!req.body.product) req.body.product = req.params.product;
    if (!req.body.user) req.body.user = req.user.id;
    next();
};

exports.getAllReviews = catchAsync(async (req, res, next) =>{
    // #swagger.tags = ['Products Comments  & Ratings']
    let filter = {};
    if (req.params.id) filter = { model: req.params.id };

    const features = new APIFeatures(Review.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .Pagination();

    const doc = await features.query;
    for (const e of doc) {
        const i = doc.indexOf(e);
        if(e.user?._id == null) {
            continue;
        }
        const user = await User.findById(e.user._id);
        doc[i].userName = `${user.firstName} ${user.lastName}`
        doc[i].userPhoto = user.userPhoto
    }
    const user = await User.findById(req.user.id);
    doc.forEach((element, index) => {
        doc[index].status = !!user.lovedProducts.includes(element.id);
    })
    res.status(200).json({
        status: 'success',
        results: doc.length,
        doc,
    });
});

exports.getReview = async (req, res, next) => {
    // #swagger.tags = ['Products Comments  & Ratings']
  
    return factory.getOne(req, res, next,Review);
  }; 

exports.createReview = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Products Comments  & Ratings']
    const userId = req.user.id

    const user = await User.findById(userId);

    const { review, rating, product } = req.body;

    const freshReview = await Review.create({
        fullName: `${user.firstName} ${user.lastName}`,
        userPhoto: user.userPhoto,
        review,
        rating,
        product,
        user: userId,
    });

    await Product.findByIdAndUpdate(product, {
        $push: { Reviews: freshReview._id },
    })

    res.status(201).json({
        status: 'success',
        message: "Review created successfully!",
        freshReview
    })
})

exports.updateReview = factory.updateOne(Review);
exports.deleteReview = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Products Comments  & Ratings']
    const reviewId =  req.params.id;

    const review = await Review.findById(reviewId)

    let data;
    if (review.user.id === req.user.id || req.user.role === 'admin') {
        await Product.findByIdAndUpdate(review.product, {
            $pull: { Reviews: reviewId },
        })
        data = await Review.findByIdAndDelete(req.params.id)
    }
    else {
        return next(new AppError('This Review did not belong to you!', 403));
    }

    if (!data) {
        return next(new AppError('No document found with that ID', 404));
    }

    res.status(201).json({
        status: 'success',
        data: null
    });
})