const Consultation = require("../models/consultationModel");
const Consultant = require("../models/consultantModel");
const ConsultationReview = require("../models/consultationReview");

const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const Review = require("../models/reviewModel");

exports.setConsultationUserIds = (req, res, next) => {
  if (!req.body.Consultation) req.body.Consultation = req.params.Consultation;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Consultation Review']
  /*  #swagger.description = 'TO CUSTOMIZE YOUR REQUEST: ?price[gte]=1000&price[lte]=5000 OR ?category[in]=electronics,clothing OR ?page=3&sort=-createdAt&limit=20&fields=name,description ' */
  /*  #swagger.parameters['limit'] = {
                in: 'query',
                description: 'Page size: ex: ?limit=10',
  type: 'number'
        } */
  /*  #swagger.parameters['fields'] = {
                in: 'query',
                description: 'example: ?fields=name,description' ,
        } */
  /*  #swagger.parameters['page'] = {
                in: 'query',
                description: 'indexing page: ex: ?page=2',
  type: 'number'
        } */
  /*  #swagger.parameters['sort'] = {
                in: 'query',
                description: 'example: ?sort=name,-createdAt',
        } */

  let filter = {};
  if (req.params.id) filter = { model: req.params.id };

  const review = await ConsultationReview.find(filter);

  const features = new APIFeatures(review, req.query)
    .filter()
    .sort()
    .limitFields()
    .Pagination();

  const filteredReviews = await features.query;

  res.status(200).json({
    status: "success",
    results: review.length,
    reviews: filteredReviews,
  });
});

exports.getReview = async (req, res, next) => {
  // #swagger.tags = ['Community']
  /*  #swagger.parameters['id'] = {
                in: 'body',
                description: 'example: ?sort=name,-createdAt',
        } */
  return factory.getOne(req, res, next, ConsultationReview);
};

exports.createReview = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Consultation Review']
  const userId = req.user.id;
  const consultationId = req.params.id;

  const consultation = await Consultation.findById(consultationId);

  if (
    !consultation.consultants.find((e) => e.user?._id?.toString() === userId)
  ) {
    return next(
      new AppError("You are not allowed to review this consultation", 401)
    );
  }

  const { review, rating } = req.body;

  const freshReview = await ConsultationReview.create({
    review,
    rating,
    user: userId,
    consultation: consultationId,
  });

  consultation.Reviews.push(freshReview._id);
  await consultation.save();

  res.status(201).json({
    status: "success",
    review: freshReview,
  });
});

exports.updateReview = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Consultation Review']
  const userId = req.user.id;
  const consultationReviewId = req.params.id;

  const consultationReview = await ConsultationReview.findById(
    consultationReviewId
  );

  if (consultationReview.user._id === userId) {
    return next(new AppError("You are not allowed to update this review", 401));
  }

  const { review, rating } = req.body;

  const updatedReview = await ConsultationReview.findOneAndUpdate(
    {
      _id: consultationReviewId,
      user: userId,
    },
    {
      review,
      rating,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: "success",
    review: updatedReview,
  });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Consultation Review']
  const userId = req.user.id;
  const reviewId = req.params.id;

  const review = await ConsultationReview.findById(reviewId);

  if (review.user._id !== userId) {
    return next(new AppError("You are not allowed to delete this review", 401));
  }

  await Consultation.findOneAndUpdate(
    { _id: review.consultation },
    { $pull: { Reviews: reviewId } }
  );

  await review.remove();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
