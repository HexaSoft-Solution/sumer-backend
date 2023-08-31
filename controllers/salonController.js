const Salon = require('../models/salonModel');
const SalonReview = require('../models/salonReviewModel');
const User = require('../models/userModel');

const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const cloudinary = require("../utils/cloudinary");
const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const Service = require("../models/serviceModel");
const Consultation = require("../models/consultationModel");

exports.getAllSalons = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Salon']
    let filter = {};
    if (req.params.id) filter = { model: req.params.id };
    const features = new APIFeatures(Salon.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .Pagination();
    const salons = await features.query;


    res.status(200).json({
        status: 'success',
        results: salons.length,
        salons,
    });
})

exports.getSalon = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Salon']
    const salon = await Salon.findById(req.params.id);
    const Reviews = await SalonReview.find({
        _id: { $in: salon.salonReviews }
    });

    res.status(200).json({
        status: "Success",
        salon,
        Reviews
    })
})

exports.loveSalon = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Salon']
    const userId = req.user.id;
    const salonId = req.params.id;

    const user = await User.findById(userId);

    if (user.lovedSalons.includes(salonId)) {
        return res.status(400).json({
            status: 'fail',
            message: "You have already loved this salon"
        });
    }

    await User.findByIdAndUpdate(userId, {
        $push: { "lovedSalons":  salonId   },
    },{
        new: true,
        runValidators: true,
    });

    await Salon.findByIdAndUpdate(salonId, {
        $inc: { "favouriteCount": 1 }
    });


    res.status(200).json({
        status: 'success',
        message: "Salon love successfully"
    });
});

exports.unloveSalon = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Salon']
    const userId = req.user.id;
    const salonId = req.params.id;

    const user = await User.findById(userId);

    if (!user.lovedProducts.includes(salonId)) {
        return res.status(400).json({
            status: 'fail',
            message: "You have not loved this product"
        });
    }

    await User.findByIdAndUpdate(userId, {
        $pull: { "lovedSalons":  salonId  }
    },{
        new: true,
        runValidators: true,
    });

    await Salon.findByIdAndUpdate(salonId, {
        $inc: { "favouriteCount": -1 }
    });

    res.status(200).json({
        status: 'success',

    });
});

exports.uploadPhoto = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Salon']
    const salonId = req.params.id;

    const salon = await Salon.findById(salonId)

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${salon._id}/${salon._id}Photo`,
        folder: 'salons',
        resource_type: 'image',
    });

    const updatedSalon = await Salon.findByIdAndUpdate(salonId, {
        salonPhoto: result.secure_url,
        cloudinaryId: result.public_id,
    })

    res.status(200).json({
        status: "success",
        updatedSalon
    })
})

exports.uploadServicePhoto = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Salon']
    const salonId = req.params.id;
    const { _id } = req.body;

    const salon = await Salon.findById(salonId)

    const serviceIndex = salon.service.find(e => e._id === _id)

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${salon._id}/${salon.service[serviceIndex].name}//${salon.service[serviceIndex].name}Photo`,
        folder: 'salons',
        resource_type: 'image',
    });

    const updatedSalon = await Salon.findByIdAndUpdate(salonId, {
        $set: {
            'service.$.ServicePhoto': result.secure_url,
            'service.$.cloudinaryId': result.public_id,
        }
    })

    res.status(200).json({
        status: "success",
        updatedSalon
    })
})


exports.createSalon = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Salon']
    const userId = req.user.id;

    const {
        name,
        service,
        about,
        pricePerHour,
        address,
        phone
    } = req.body;

    const salon = await Salon.create({
        name,
        service: [{name: service}],
        about,
        pricePerHour,
        address,
        phone,
        owner: userId,
    });

    await User.findByIdAndUpdate(userId, {
        salonCreated: salon._id
    });

    res.status(201).json({
       status: "success",
       message: "Salon created successfully",
       salon
    });
});

exports.updateSalon = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Salon']
    const salonId = req.params.id;

    console.log(req.user.salonCreated.toString())
    console.log(req.user)
    console.log(salonId)

    if (req.user.salonCreated.toString() !== salonId) {
        return res.status(400).json({
            status: 'fail',
            message: "You are not the owner of this salon"
        });
    }

    const {
        name,
        service,
        about,
        address,
        phone,
        pricePerHour
    } = req.body;

    const updatedSalon = await Salon.findOneAndUpdate({ _id: salonId }, {
        name,
        service,
        about,
        address,
        phone,
        pricePerHour
    });

    res.status(200).json({
        status: "success",
        message: "Salon updated successfully",
        updatedSalon
    });
});

exports.addServices = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Salon']
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
                              },
                              name: {
                                  type: "string",
                              },
                              description: {
                                  type: "string",
                              }

                          },
                          required: ["image"]
                      }
                  }
              }
          }
      */
    const salonId = req.user.salonCreated;

    if (!salonId) {
        return next(new AppError("You don't have a salon profile", 400));
    }

    const { name, description } = req.body;
    const { path } = req.file;

    const result = await cloudinary.uploader.upload(path, {
        public_id: `/${name}-${Math.random() * 10000000000}/${name}Photo`,
        folder: "services",
        resource_type: "image",
    });

    if (!result) {
        return next(
            new AppError("Something went wrong with the image upload", 400)
        );
    }

    const service = await Service.create({
        name,
        description,
        servicePhoto: result.secure_url,
        cloudinaryId: result.public_id,
    });

    await Salon.findByIdAndUpdate(salonId, {
        $push: { service: service._id },
    });

    res.status(200).json({
        status: "success",
        service,
    });
});

exports.searchSalon = factory.search(Salon);

exports.deleteSalon = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Salon']
    const userId = req.user.id;
    const salonId = req.params.id;

    await Salon.findByIdAndDelete(salonId);

    await User.findByIdAndUpdate(userId, {
        $pull: { "salonCreated": salonId }
    })

    res.status(200).json({
        status: "success",
        message: "Salon deleted successfully",
    })
});