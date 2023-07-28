const User = require('../models/userModel');
const Address = require('../models/addressModel')
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const cloudinary = require("../utils/cloudinary");
const jwt = require("jsonwebtoken");
const {add} = require("nodemon/lib/rules");

const signToken = (id) =>
    jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    });
};

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};

const filterArrayOfObjects = (arr, ...allowedFields) => {
    return arr.map(obj => {
        const newObj = {};
        Object.keys(obj).forEach(el => {
            if (allowedFields.includes(el)) newObj[el] = obj[el];
        });
        return newObj;
    });
};


exports.getMe = (req, res, next) =>{
    req.params.id = req.user.id;
    next();
}

exports.updateMe = catchAsync(async (req, res, next) => {
    if(req.body.password || req.body.passwordConfirm) {
        return next(new AppError(
            'This route is not for password updates. please use /updateMyPassword',
            400)
        );
    }

    const filteredBody = filterObj(req.body, "firstName", "lastName", "name", "stockName", "username", "phone",  );

    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
        },
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(201).json({
        status: 'success',
        data: null,
    });
});

exports.createUser = catchAsync(async (req, res, next) => {
    const newUser = await User.create(req.body);
    createSendToken(newUser, 201, res);
});

exports.uploadPersonalPhoto = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id)
    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${user.username}/${user.username}PersonalPhoto`,
        folder: 'users',
        resource_type: 'image',
    });
    const updatedUser =  await User.findByIdAndUpdate(req.user.id, {
        userPhoto: result.secure_url,
        cloudinaryId: result.public_id,
    });
    res.status(201).json({
        status: 'success',
        updatedUser
    });
});

exports.addAddress = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { street, city, houseNo, latitude, longitude, houseType } = req.body;
    const address = await Address.create({
        street,
        city,
        houseNo,
        latitude,
        longitude,
        houseType
    });

    await User.findByIdAndUpdate(userId, {
        $push: { addresses: address.id },
    }, { new: true })

    res.status(201).json({
        status: "success",
        message: "Address Add successful"
    })
})

exports.deleteAddress = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const addressId = req.params.addressId;
    await Address.findByIdAndRemove(addressId)
    await User.findByIdAndUpdate(userId, {
        $pull: { addresses: addressId }
    });

    res.status(201).json({
        status: "success",
        message: "address remove successful"
    })
})

exports.getUsers = factory.getAll(User);
exports.getUser = catchAsync(async (req, res, next) => {
    let user = await User.findById(req.params.id);

    if (!user) {
        return next(new AppError('No document found with that ID. 404'));
    }

    const addressId = user.addresses

    const address = await Address.find({
        _id: { $in: addressId }
    })

    res.status(200).json({
        status: 'success',
        user,
        address
    });
});
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);