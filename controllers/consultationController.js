const Consultation = require('../models/consultationModel');
const Service = require('../models/serviceModel');
const Certificate = require('../models/certificateModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const cloudinary = require("../utils/cloudinary");

exports.createConsultationProfile = catchAsync(async (req, res, next) => {

    const { Specialization, about, price } = req.body

    if (req.user.role !== 'consultant') {
        return next(new AppError('You are not a consultation', 400));
    }

    const consultation = await Consultation.findOne({ owner: req.user._id })

    if (consultation) {
        return next(new AppError('You already have a consultation profile', 400));
    }

    const consultationProfile = await Consultation.create({
        Specialization,
        about,
        price,
        owner: req.user._id
    })

    await User.findByIdAndUpdate(req.user._id, { consultation: consultationProfile.id })

  res.status(201).json({
    status: 'success',
      consultationProfile
  });
});

exports.updateConsultationProfile = catchAsync(async (req, res, next) => {
    if (req.user.role !== "consultant") {
        return next(new AppError("You are not a consultation", 400));
    }

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const { Specialization, about } = req.body

    const updatedConsultation = await Consultation.findByIdAndUpdate(consultationId, {
        Specialization,
        about
    })

    res.status(200).json({
        status: 'success',
        updatedConsultation
    })
});

exports.addServices = catchAsync(async (req, res, next) => {
    if (req.user.role !== "consultant") {
        return next(new AppError("You are not a consultation", 400));
    }

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const { name, description } = req.body

    const service = await Service.create({ name, description });

    await Consultation.findByIdAndUpdate(consultationId, {
        $push: { services: service._id }
    })

    res.status(200).json({
        status: 'success',
        service
    })
});

exports.addServicesPhoto = catchAsync(async (req, res, next) => {
    const serviceId = req.params.id

    if (req.user.role !== "consultant") {
        return next(new AppError("You are not a consultation", 400));
    }

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId)


    if (!consultation.services.include(serviceId)) {
        return next(new AppError("You don't have this service", 400));
    }

    const service = await Service.findById(serviceId)

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${serviceId}/${service.name}Photo`,
        folder: 'services',
        resource_type: 'image',
    });

    const updatedService = await Service.findByIdAndUpdate(serviceId, {
        servicePhoto: result.secure_url,
        cloudinaryId: result.public_id,
    })

    res.status(200).json({
        status: 'success',
        updatedService
    })
})

exports.deleteservicePhoto = catchAsync(async (req, res, next) => {
    const serviceId = req.params.id

    if (req.user.role !== "consultant") {
        return next(new AppError("You are not a consultation", 400));
    }

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId)

    if (!consultation.services.include(serviceId)) {
        return next(new AppError("You don't have this service", 400));
    }

    const updateService = await Service.findByIdAndUpdate(serviceId, {
        servicePhoto: null,
        cloudinaryId: null,
    })

    res.status(200).json({
        status: 'success',
        updateService
    })
})

exports.deleteService = catchAsync(async (req, res, next) => {
    const serviceId = req.params.id
    const userId = req.user.id

    if (req.user.role !== "consultant") {
        return next(new AppError("You are not a consultation", 400));
    }

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId)

    if (!consultation.services.include(serviceId)) {
        return next(new AppError("You don't have this service", 400));
    }

    await User.findByIdAndUpdate(userId, {
        $pull: { services: serviceId }
    })

    await Service.findOneAndDelete(serviceId)

    res.status(200).json({
        status: 'success',
        message: 'Service deleted'
    })
});