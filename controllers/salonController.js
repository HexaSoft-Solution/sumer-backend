const Salon = require('../models/salonModel');
const SalonReview = require('../models/salonReviewModel');
const User = require('../models/userModel');

const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const cloudinary = require("../utils/cloudinary");
const APIFeatures = require("../utils/apiFeatures");

exports.getAllSalons = catchAsync(async (req, res, next) => {
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
    const userId = req.user.id;

    const {
        name,
        service,
        desc,
        pricePerHour,
        address,
        phone
    } = req.body;

    const salon = await Salon.create({
        name,
        service: [{name: service}],
        desc,
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
    const salonId = req.params.id;

    if (req.user.salonCreated !== salonId) {
        return res.status(400).json({
            status: 'fail',
            message: "You are not the owner of this salon"
        });
    }

    const {
        name,
        service,
        desc,
        address,
        phone,
    } = req.body;

    const updatedSalon = await Salon.findByIdAndUpdate(salonId, {
        name,
        service,
        desc,
        address,
        phone,
    });

    res.status(200).json({
        status: "success",
        message: "Salon updated successfully",
        updatedSalon
    });
});

exports.searchSalon = factory.search(Salon);

exports.deleteSalon = catchAsync(async (req, res, next) => {
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