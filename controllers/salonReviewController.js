const SalonReview = require('../models/salonReviewModel');
const Salon = require('../models/salonModel');
const User = require('../models/userModel');

const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');

exports.setSalonUserIds = (req, res, next) => {
    if (!req.body.salon) req.body.salon = req.params.salon;
    if (!req.body.user) req.body.user = req.user.id;
    next();
}

exports.getAllSalonReviews = catchAsync(async (req, res, next) => {
    let filter = {};
    if (req.params.id) filter = { model: req.params.id };

    const features = new APIFeatures(SalonReview.find(filter), req.query)
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
        doc[index].status = !!user.lovedSalons.includes(element.id);
    })

    res.status(200).json({
        status: 'success',
        results: doc.length,
        doc,
    });
});

exports.getSalonReview = factory.getOne(SalonReview);



exports.createSalonReview = catchAsync(async (req, res, next) => {
    const userId = req.user.id

    const user = await User.findById(userId);

    const { review, rating, salon } = req.body;

    const freshReview = await SalonReview.create({
        fullName: `${user.firstName} ${user.lastName}`,
        userPhoto: user.userPhoto,
        review,
        rating,
        salon,
        user: userId,
    });

    await Salon.findByIdAndUpdate(salon, {
        $push: { reviews: freshReview._id },
    });

    res.status(201).json({
        status: 'success',
        message: "Review created successfully",
        freshReview
    });
});




exports.updateSalonReview = factory.updateOne(SalonReview);

exports.deleteSalonReview = catchAsync(async (req, res, next) => {
    const reviewId = req.params.id;

    const review = await SalonReview.findById(reviewId);

    let data
    if (req.user.id === review.user._id.toString()) {
        await Salon.findByIdAndUpdate(review.salon, {
            $pull: { salonReviews: reviewId },
        })
    } else {
        return next(new AppError('You are not allowed to delete this review', 403));
    }

    if (!data) {
        return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null,
    })
});