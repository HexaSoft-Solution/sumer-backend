const Consultation = require('../models/consultationModel');
const Service = require('../models/serviceModel');
const Certificate = require('../models/certificateModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');
const Consultant = require('../models/consultantModel');
const Message = require('../models/messageModel');

const factory = require('./handlerFactory');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const cloudinary = require("../utils/cloudinary");

exports.getAllConsultations = factory.getAll(Consultation);
exports.searchConsultations = factory.search(Consultation);
exports.getConsultantation = factory.getOne(Consultation)

exports.createConsultationProfile = catchAsync(async (req, res, next) => {

    const { Specialization, about, price } = req.body

    const consultation = await Consultation.findOne({ owner: req.user._id })

    if (consultation) {
        return next(new AppError('You already have a consultation profile', 400));
    }

    if (!req.user.createConsultation){
        return next(new AppError('You need to create a payment profile first', 400));
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

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const { name, description } = req.body

    const service = await Service.create({ name, description });

    await Consultation.findByIdAndUpdate(consultationId, {
        $push: { service: service._id }
    })

    res.status(200).json({
        status: 'success',
        service
    })
});

exports.addServicesPhoto = catchAsync(async (req, res, next) => {
    const serviceId = req.params.id

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

exports.addCertificate = catchAsync(async (req, res, next) => {
    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const { title, issueDate, expireDate, certificateID, certificateURL } = req.body

    const certificate = await Certificate.create({
        title,
        issueDate,
        expireDate,
        certificateID,
        certificateURL
    })

    const updateConsultation = await Consultation.findByIdAndUpdate(consultationId, {
        $push: { certificates: certificate._id }
    })


    res.status(200).json({
        status: 'success',
        certificate,
        updateConsultation
    })
})

exports.addCertificatePhoto = catchAsync(async (req, res, next) => {
    const certificateId = req.params.id

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId);

    if (!consultation.certificates.include(certificateId)) {
        return next(new AppError("You don't have this certificate", 400));
    }

    const certificate = await Certificate.findById(certificateId)

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${certificateId}/${certificate.title}Photo`,
        folder: 'certificates',
        resource_type: 'image',
    });

    const updatedCertificate = await Certificate.findByIdAndUpdate(certificateId, {
        certificatePhoto: result.secure_url,
        cloudinaryId: result.public_id,
    })


    res.status(200).json({
        status: 'success',
        updatedCertificate
    })
});

exports.deleteCertificate = catchAsync(async (req, res, next) => {
    const certificateId = req.params.id
    const userId = req.user.id

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId)

    if (!consultation.certificates.include(certificateId)) {
        return next(new AppError("You don't have this certificate", 400));
    }

    await User.findByIdAndUpdate(userId, {
        $pull: { certificates: certificateId }
    })

    await Certificate.findOneAndDelete(certificateId)

    res.status(200).json({
        status: 'success',
        message: 'Certificate deleted'
    })
});

exports.deleteCertificatePhoto = catchAsync(async (req, res, next) => {
    const certificateId = req.params.id
    const userId = req.user.id

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId)

    if (!consultation.certificates.include(certificateId)) {
        return next(new AppError("You don't have this certificate", 400));
    }

    const updatedCertificate = await Certificate.findByIdAndUpdate(certificateId, {
        certificatePhoto: null,
        cloudinaryId: null,
    });

    res.status(200).json({
        status: 'success',
        updatedCertificate
    })
})


exports.addCourse = catchAsync(async (req, res, next) => {
    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const { courseName, issueDate } = req.body

    const course = await Course.create({
        courseName,
        issueDate
    })

    const updatedConsultation = await Consultation.findByIdAndUpdate(consultationId, {
        $push: { courses: course._id }
    })

    res.status(200).json({
        status: 'success',
        course,
        updatedConsultation
    })
})

exports.addCoursePhoto = catchAsync(async (req, res, next) => {
    const courseId = req.params.id

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId);

    if (!consultation.courses.include(courseId)) {
        return next(new AppError("You don't have this course", 400));
    }

    const course = await Course.findById(courseId)

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${courseId}/${course.courseName}Photo`,
        folder: 'courses',
        resource_type: 'image',
    });

    const updatedCourse = await Course.findByIdAndUpdate(courseId, {
        coursePhoto: result.secure_url,
        cloudinaryId: result.public_id,
    })

    res.status(200).json({
        status: 'success',
        updatedCourse
    })
})

exports.deleteCourse = catchAsync(async (req, res, next) => {
    const courseId = req.params.id
    const userId = req.user.id

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId)

    if (!consultation.courses.include(courseId)) {
        return next(new AppError("You don't have this course", 400));
    }

    await User.findByIdAndUpdate(userId, {
        $pull: { courses: courseId }
    })

    await Course.findOneAndDelete(courseId)

    res.status(200).json({
        status: 'success',
        message: 'Course deleted'
    })
});

exports.deleteCoursePhoto = catchAsync(async (req, res, next) => {
    const courseId = req.params.id
    const userId = req.user.id

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId)

    if (!consultation.courses.include(courseId)) {
        return next(new AppError("You don't have this course", 400));
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, {
        coursePhoto: null,
        cloudinaryId: null,
    });

    res.status(200).json({
        status: 'success',
        updatedCourse
    })
})

exports.consultationSendChat = catchAsync(async (req, res, next) => {
    const userId = req.user.id
    const consultantId = req.params.id

    const { messageChat } = req.body

    const consultant = await Consultant.findById(consultantId)

    if (userId !== consultant.consultant._id.toString()) {
        return next(new AppError("You don't have access to this chat", 400));
    }

    if (consultant.status === "Ended") {
        return next(new AppError("This chat has ended", 400));
    }

    const message = await Message.create({
        sender: userId,
        receiver: consultant.user,
        message: messageChat
    })

    const updatedConsultant = await Consultant.findByIdAndUpdate(consultantId, {
        $push: { messages: message._id }
    })

    res.status(200).json({
        status: 'success',
        message,
        updatedConsultant
    })
});

exports.userSendChat = catchAsync(async (req, res, next) => {
    const userId = req.user.id
    const consultantId = req.params.id

    const { messageChat } = req.body

    const consultant = await Consultant.findById(consultantId)

    if (userId !== consultant.user._id.toString()) {
        return next(new AppError("You don't have access to this chat", 400));
    }

    if (consultant.status === "Ended") {
        return next(new AppError("This chat has ended", 400));
    }

    const message = await Message.create({
        sender: userId,
        receiver: consultant.consultant,
        message: messageChat
    })

    const updatedConsultant = await Consultant.findByIdAndUpdate(consultantId, {
        $push: { messages: message._id }
    })

    res.status(200).json({
        status: 'success',
        message,
        updatedConsultant
    })
});


exports.viewConsultation = catchAsync(async (req, res, next) => {
    const userId = req.user.id
    const consultantId = req.params.id

    const consultant = await Consultant.findById(consultantId)

    if (userId !== consultant.user._id.toString() && userId !== consultant.consultant._id.toString()) {
        return next(new AppError("You don't have access to this chat", 400));
    }

    if (consultant.status === "Ended") {
        return next(new AppError("This chat has ended", 400));
    }

    res.status(200).json({
        status: 'success',
        consultant
    })
});

exports.activeConsultation = catchAsync(async (req, res, next) => {
    const userId = req.user.id
    const consultantId = req.params.id

    const updatedConsultant = await Consultation.findByIdAndUpdate(consultantId, {
        status: "Confirmed"
    })

    res.status(200).json({
        status: 'success',
        updatedConsultant
    })
});