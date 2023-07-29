const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Review = require('../models/reviewModel');
const User = require('../models/userModel')

const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const cloudinary = require("../utils/cloudinary");
const APIFeatures = require("../utils/apiFeatures");

exports.getAllProducts = catchAsync(async (req, res, next) => {
    let filter = {};
    if (req.params.id) filter = { model: req.params.id };
    const features = new APIFeatures(Product.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .Pagination();
    const Products = await features.query;


    res.status(200).json({
        status: 'success',
        results: Products.length,
        Products,
    });
})

exports.getProduct = catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    const Reviews = await Review.find({
        _id: { $in: product.Reviews }
    });

    res.status(200).json({
        status: "Success",
        product,
        Reviews
    })
})

exports.loveProduct = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const productId = req.params.id;

    const user = await User.findById(userId);

    if (user.lovedProducts.includes(productId)) {
        return res.status(400).json({
            status: 'fail',
            message: "You have already loved this product"
        });
    }

    await User.findByIdAndUpdate(userId, {
        $push: { "lovedProducts":  productId   },
    },{
        new: true,
        runValidators: true,
    });

    await Product.findByIdAndUpdate(productId, {
        $inc: { "favouriteCount": 1 }
    });


    res.status(200).json({
        status: 'success',
        message: "Product love successfully"
    });
});

exports.unloveProduct = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const productId = req.params.id;

    const user = await User.findById(userId);

    if (!user.lovedProducts.includes(productId)) {
        return res.status(400).json({
            status: 'fail',
            message: "You have not loved this product"
        });
    }

    await User.findByIdAndUpdate(userId, {
        $pull: { "lovedProducts":  productId  }
    },{
        new: true,
        runValidators: true,
    });

    await Product.findByIdAndUpdate(productId, {
        $inc: { "favouriteCount": -1 }
    });

    res.status(200).json({
        status: 'success',

    });
});

exports.uploadPhoto = catchAsync(async (req, res, next) => {
    const productId = req.params.id;

    const product = await Product.findById(productId)

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${product._id}/${product._id}Photo`,
        folder: 'products',
        resource_type: 'image',
    });

    const updatedProduct = await Product.findByIdAndUpdate(productId, {
        ProductPhoto: result.secure_url,
        cloudinaryId: result.public_id,
    })

    res.status(200).json({
        status: "success",
        updatedProduct
    })
})

exports.uploadMultiplePhoto = catchAsync(async (req, res, next) => {
    const productId = req.params.id;

    const product = await Product.findById(productId)

    const imageLength = product.imageArray.length;

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${product._id}-Multiple/${product._id}Photo-${imageLength}`,
        folder: 'products',
        resource_type: 'image',
    });

    const updatedProduct = await Product.findByIdAndUpdate(productId, {
        $push: { "imageArray": {
                ProductPhotoPerview: result.secure_url,
                cloudinaryId: result.public_id,
            }}
    })

    res.status(200).json({
        status: "success",
        updatedProduct
    })
});

exports.deleteMultiplePhoto = catchAsync(async (req, res, next) => {
    const productId = req.params.id;
    const { _id } = req.body;

    await Product.findByIdAndUpdate(productId, {
        $pull: { "imageArray": {
                _id
            } }
    })

    res.status(200).json({
        status: "success",
        message: "Product deleted successfully"
    })
})

exports.createProduct = catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const {
        name,
        desc,
        price,
        size,
        category,
        availabilityCount,
        howToUse,
        highlights,
    } = req.body;

    const product = await Product.create({
        name,
        desc,
        price,
        size,
        category,
        availabilityCount,
        howToUse,
        highlights,
        owner: userId
    });

    await Category.findByIdAndUpdate(category, {
        $push: { "ProductsIds": product.id }
    });

    const owner = await User.findByIdAndUpdate(userId, {
       $push: { "productsCreated": product.id },
    });

    res.status(201).json({
        status: "success",
        product,
        owner
    });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
    const userId = req.user.id
    const productId = req.params.id;

    const user = await User.findById(userId);

    if (user.role === 'business' && !user.productsCreated.includes(productId)) {
        return res.status(400).json({
            status: 'fail',
            message: "You are not allowed to update this product"
        });
    }

    const {
        name,
        desc,
        price,
        size,
        category,
        availabilityCount,
        howToUse,
        highlights,
    } = req.body;

    const product = await Product.findByIdAndUpdate(productId, {
        name,
        desc,
        price,
        size,
        category,
        availabilityCount,
        howToUse,
        highlights,
    });

    res.status(201).json({
        status: "success",
        message: "Product updated successfully",
        product
    });
});

exports.searchProduct = factory.search(Product)

exports.deleteProduct = catchAsync(async (req, res, next) => {
    const productIds = req.params.id;
    const currentProduct = await Product.findById(productIds)

    await Category.findByIdAndUpdate(currentProduct.category, {
        $pull: { "ProductsIds": req.params.id }
    });

    await Product.findByIdAndDelete(productIds)

    res.status(201).json({
        status: 'Deleting Success',
    })
})