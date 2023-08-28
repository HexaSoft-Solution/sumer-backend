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
exports.deleteConsultation = factory.deleteOne(Consultation);
exports.deleteMessage = factory.deleteOne(Message)


exports.getMyProfile = catchAsync(async (req, res, next) => {
    const userId = req.user.id

    const consultation = await Consultation.findOne({ owner: userId })

    if (!consultation) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    res.status(200).json({
        status: 'success',
        consultation
    })
});

exports.endConsultant = catchAsync(async (req, res, next) => {
    const userId = req.user.id
    const consultantId = req.params.id

    const consultant = await Consultant.findById(consultantId)

    if (userId !== consultant.consultant._id.toString()) {
        return next(new AppError("You don't have access to this chat", 400));
    }

    if (consultant.status === "Ended") {
        return next(new AppError("This chat has ended", 400));
    }

    const updatedConsultant = await Consultant.findByIdAndUpdate(consultantId, {
        status: "Ended"
    })

    res.status(200).json({
        status: 'success',
        updatedConsultant
    })
});

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

exports.editQuestion = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const consultId = req.params.id;

    const consultant = await Consultant.findById(consultId)

if (userId !== consultant.consultant._id.toString()) {
        return next(new AppError("You don't have access to this chat", 400));
    }

    const { title } = req.body

    const updatedConsultant = await Consultant.findByIdAndUpdate(consultId, {
        title
    })

    res.status(201).json({
        status: 'success',
        updatedConsultant
    });
})

exports.deleteConsultant = catchAsync(async (req, res, next) => {
    const userId = req.user.id
    const consultantId = req.params.id

    const consultant = await Consultant.findById(consultantId)

    if (userId !== consultant.consultant._id.toString()) {
        return next(new AppError("You don't have access to this chat", 400));
    }

    if (consultant.status === "Ended") {
        return next(new AppError("This chat has ended", 400));
    }

    await User.findByIdAndUpdate(userId, {
        $pull: { consultations: consultantId }
    })

    await Consultant.findOneAndDelete(consultantId)

    res.status(200).json({
        status: 'success',
        message: 'Consultant deleted'
    })
});

exports.updateConsultationProfile = catchAsync(async (req, res, next) => {

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const { Specialization, about, price } = req.body

    const updatedConsultation = await Consultation.findByIdAndUpdate(consultationId, {
        Specialization,
        about,
        price
    })

    res.status(200).json({
        status: 'success',
        updatedConsultation
    })
});

exports.addServices = catchAsync(async (req, res, next) => {
/*	#swagger.requestBody = {
            required: true,
            "@content": {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            image: {
                                type: "string",
                                format: "binary"
                            }
                        },
                        required: ["image"]
                    }
                }
            } 
        }
    */ 
    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }



    const { name, description } = JSON.parse(req.body.data);
    const { path } = req.file

    const result = await cloudinary.uploader.upload(path, {
        public_id: `/${name}-${Math.random() * 10000000000}/${name}Photo`,
        folder: 'services',
        resource_type: 'image',
    });


    if (!result) {
        return next(new AppError('Something went wrong with the image upload', 400));
    }

    const service = await Service.create({
        name,
        description,
        servicePhoto: result.secure_url,
        cloudinaryId: result.public_id,
    });

    await Consultation.findByIdAndUpdate(consultationId, {
        $push: { service: service._id }
    })

    res.status(200).json({
        status: 'success',
        service
    })
});

exports.editService = catchAsync(async (req, res, next) => {
    const serviceId = req.params.id

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const consultation = await Consultation.findById(consultationId)

    console.log(consultation)

    if (!consultation.service.find(e => e._id.toString()  === serviceId)) {
        return next(new AppError("You don't have this service", 400));
    }

    const { name, description } = req.body

    const service = await Service.findById(serviceId)

    if (!service) {
        return next(new AppError("You don't have this service", 400));
    }

    const updatedService = await Service.findByIdAndUpdate(serviceId, {
        name,
        description
    })

    res.status(200).json({
        status: 'success',
        updatedService
    })
})

exports.addServicesPhoto = catchAsync(async (req, res, next) => {
    const serviceId = req.params.id

    const consultationId = req.user.consultation

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const consultation = await Consultation.findById(consultationId)

    if (!consultation.service.find(e => e._id.toString() === serviceId)) {
        return next(new AppError("You don't have this service", 400));
    }

    const service = await Service.findById(serviceId)
    const { path } = req.file

    const result = await cloudinary.uploader.upload(path, {
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

   /*	#swagger.requestBody = {
            required: true,
            "@content": {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            image: {
                                type: "string",
                                format: "binary"
                            }
                        },
                        required: ["image"]
                    }
                }
            } 
        }
    */ 

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId)

    if (!consultation.service.find(e => e._id.toString() === serviceId)) {
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

    if (!consultation.services.find(e => e._id.toString() === serviceId)) {
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

   /*	#swagger.requestBody = {
            required: true,
            "@content": {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            image: {
                                type: "string",
                                format: "binary"
                            }
                        },
                        required: ["image"]
                    }
                }
            } 
        }
    */ 


    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const { title, issueDate, expireDate, certificateID, certificateURL } = JSON.parse(req.body.data);

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${title}-${Math.random() * 10000000000}/${title}Photo`,
        folder: 'certificates',
        resource_type: 'image',
    });

    if (!result) {
        return next(new AppError('Something went wrong with the image upload', 400));
    }

    const certificate = await Certificate.create({
        title,
        issueDate,
        expireDate,
        certificateID,
        certificateURL,
        certificatePhoto: result.secure_url,
        cloudinaryId: result.public_id,
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

exports.editCertificate = catchAsync(async (req, res, next) => {
    const consultationId = req.user.consultation

    const certificateId = req.params.id

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const { title, issueDate, expireDate, certificateID, certificateURL } = req.body

    const consultation = await Consultation.findById(consultationId);

    if (!consultation.certificates.find(e => e._id.toString() === certificateId)) {
        return next(new AppError("You don't have this certificate", 400));
    }

    const updatedCertificate = await Certificate.findByIdAndUpdate(certificateId, {
        title,
        issueDate,
        expireDate,
        certificateID,
        certificateURL
    })

    res.status(201).json({
        status: 'success',
        updatedCertificate
    });
})

exports.addCertificatePhoto = catchAsync(async (req, res, next) => {

    const certificateId = req.params.id

    const consultationId = req.user.consultation
/*	#swagger.requestBody = {
            required: true,
            "@content": {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            image: {
                                type: "string",
                                format: "binary"
                            }
                        },
                        required: ["image"]
                    }
                }
            } 
        }
    */ 
    

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId);

    if (!consultation.certificates.find(e => e._id.toString() === certificateId)) {
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

    if (!consultation.certificates.find(e => e._id.toString() === certificateId)) {
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

    if (!consultation.certificates.find(e => e._id.toString() === certificateId)) {
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
    /*	#swagger.requestBody = {
                required: true,
                "@content": {
                    "multipart/form-data": {
                        schema: {
                            type: "object",
                            properties: {
                                image: {
                                    type: "string",
                                    format: "binary"
                                }
                            },
                            required: ["image"]
                        }
                    }
                } 
            }
        */ 
    const consultationId = req.user.consultation



    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const { courseName, issueDate } = JSON.parse(req.body.data)

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${courseName}-${Math.random() * 100000000}/${courseName}Photo`,
        folder: 'courses',
        resource_type: 'image',
    });

    if (!result.secure_url) {
        return next(new AppError('Something went wrong with the image upload', 400));
    }

    const course = await Course.create({
        courseName,
        issueDate,
        coursePhoto: result.secure_url,
        cloudinaryId: result.public_id,
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

exports.editCourse = catchAsync(async (req, res, next) => {
    const consultationId = req.user.consultation

    const courseId = req.params.id

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }

    const { courseName, issueDate } = req.body

    const consultation = await Consultation.findById(consultationId);

    if (!consultation.courses.find(e => e._id.toString() === courseId)) {
        return next(new AppError("You don't have this course", 400));
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, {
        courseName,
        issueDate
    })

    res.status(201).json({
        status: 'success',
        updatedCourse
    });
})

exports.addCoursePhoto = catchAsync(async (req, res, next) => {
    const courseId = req.params.id

    const consultationId = req.user.consultation

  /*	#swagger.requestBody = {
            required: true,
            "@content": {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            image: {
                                type: "string",
                                format: "binary"
                            }
                        },
                        required: ["image"]
                    }
                }
            } 
        }
    */ 

    if (!consultationId) {
        return next(new AppError("You don't have a consultation profile", 400));
    }
    const consultation = await Consultation.findById(consultationId);

    if (!consultation.courses.find(e => e._id.toString() === courseId)) {
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

    if (!consultation.courses.find(e => e._id.toString() === courseId)) {
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

    if (!consultation.courses.find(e => e._id.toString() === courseId)) {
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

exports.createConsultantTicket = catchAsync(async (req, res, next) => {
    const userId = req.user.id

    const { title, consultatonId } = req.body;

    if (!req.user.createConsultant.find(e => e === consultatonId)) {
        return next(new AppError("You can not contant with this consultant", 401));
    }

    const consultant = await Consultant.create({
        title,
        user: userId,
        consultant: consultatonId
    })

});

exports.consultationSendChat = catchAsync(async (req, res, next) => {
    const userId = req.user.id
    const consultantId = req.params.id

    const { messageChat, reply } = req.body

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
        message: messageChat,
        reply
    })

    const updatedConsultant = await Consultant.findByIdAndUpdate(consultantId, {
        $push: { messages: message._id }
    })

    res.status(200).json({
        status: 'success',
        message,
        updatedConsultant
    })
})

exports.userSendChat = catchAsync(async (req, res, next) => {
    const userId = req.user.id
    const consultantId = req.params.id

    const { messageChat, reply } = req.body

    const consultant = await Consultant.findById(consultantId)

    if (userId !== consultant.user._id.toString()) {
        return next(new AppError("You don't have access to this chat", 400));
    }

    if (consultant.status === "Ended") {
        return next(new AppError("This chat has ended", 400));
    }

    if (consultant.numOfMessages === 0) {
        return next(new AppError("You don't have any messages left", 400));
    }

    const message = await Message.create({
        sender: userId,
        receiver: consultant.consultant,
        message: messageChat,
        reply
    })

    const updatedConsultant = await Consultant.findByIdAndUpdate(consultantId, {
        $push: { messages: message._id },
        $inc: { numOfMessages: -1 }
    })

    res.status(200).json({
        status: 'success',
        message,
        updatedConsultant
    })
});


exports.editMessage = catchAsync(async (req, res, next)  => {
    const { messageChat, reply } = req.body
    const userId = req.user.id;

    const messageId = req.params.id

    const messsage = await Message.findById(messageId)

    if (userId !== messsage.sender._id.toString()) {
        return next(new AppError("You don't have access to this chat", 400));
    }

    const updatedMessage = await Message.findByIdAndUpdate(messageId, {
        message: messageChat,
        reply
    })

    res.status(201).json({
        status: 'success',
        updatedMessage
    });
})

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
