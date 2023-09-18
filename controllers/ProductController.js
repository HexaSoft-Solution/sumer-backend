const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Review = require("../models/reviewModel");
const User = require("../models/userModel");
const BusinussProfile = require("../models/businessProfileModel");
const Invoice = require("../models/invoiceModel");
const Transactions = require("../models/transactionModel");

const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const cloudinary = require("../utils/cloudinary");
const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");

exports.getAllProducts = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
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
    if (req.params.id) filter = {model: req.params.id};
    const count = await Product.find();
    const features = new APIFeatures(Product.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .Pagination();
    const Products = await features.query;

    if (req.user && req.user.lovedProducts) {
        Products.forEach((product) => {
            product.isFavorite = req.user.lovedProducts.includes(product._id.toString());
        });
    }

    res.status(200).json({
        status: "success",
        results: count.length,
        Products,
    });
});

exports.getProduct = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const product = await Product.findById(req.params.id);
    const Reviews = await Review.find({
        _id: {$in: product.Reviews},
    });

    if (req.user && req.user.lovedProducts) {
        product.isFavorite = req.user.lovedProducts.includes(product._id.toString());
        await product.save();
    }

    res.status(200).json({
        status: "Success",
        data: {
            product,
            Reviews,
        },
    });
});

exports.getMyProduct = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    // Assuming user ID is available in the request (e.g., req.user.id)
    console.log(req);
    const userId = req.user.id;

    // Fetch products associated with the user
    const products = await Product.find({owner: userId});
    res.status(200).json({
        status: "Success",
        data: products,
    });
});

exports.loveProduct = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const userId = req.user.id;
    const productId = req.params.id;

    const user = await User.findById(userId);

    if (user.lovedProducts.includes(productId)) {
        return res.status(400).json({
            status: "fail",
            message: "You have already loved this product",
        });
    }

    await User.findByIdAndUpdate(
        userId,
        {
            $push: {lovedProducts: productId},
        },
        {
            new: true,
            runValidators: true,
        }
    );

    await Product.findByIdAndUpdate(productId, {
        $inc: {favouriteCount: 1},
    });

    res.status(200).json({
        status: "success",
        message: "Product love successfully",
    });
});

exports.unloveProduct = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const userId = req.user.id;
    const productId = req.params.id;

    const user = await User.findById(userId);

    if (!user.lovedProducts.includes(productId)) {
        return res.status(400).json({
            status: "fail",
            message: "You have not loved this product",
        });
    }

    await User.findByIdAndUpdate(
        userId,
        {
            $pull: {lovedProducts: productId},
        },
        {
            new: true,
            runValidators: true,
        }
    );

    await Product.findByIdAndUpdate(productId, {
        $inc: {favouriteCount: -1},
    });

    res.status(200).json({
        status: "success",
    });
});

exports.uploadPhoto = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    /* #swagger.requestBody = {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
               image: {
                                type: "string",
                                format: "binary"
                            },
            },
            required: ["image"]
          }
        }
      }
    }
  */
    const productId = req.params.id;

    const product = await Product.findById(productId);

    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `/${product._id}/${product._id}Photo`,
        folder: "products",
        resource_type: "image",
    });

    const updatedProduct = await Product.findByIdAndUpdate(productId, {
        ProductPhoto: result.secure_url,
        cloudinaryId: result.public_id,
    });

    res.status(200).json({
        status: "success",
        product: updatedProduct,
    });
});

exports.uploadMultiplePhoto = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const productId = req.params.id;
    const product = await Product.findById(productId);
    /*
  #swagger.requestBody = {
      required: true,
      content: {
          "multipart/form-data": {
              schema: {
                  type: "object",
                  properties: {
                      imageArray: {
                          type: "array",
                          items: {
                              type: "string",
                              format: "binary"
                          }
                      }
                  },
                  required: ["imageArray"]
              }
          }
      }
  }
  */

    try {
        const productId = req.params.id; // Assuming you have the product ID available

        const product = await Product.findById(productId); // Assuming you have a Product model

        const imageArray = product.imageArray || [];

        const uploadPromises = req.files.map(async (file, index) => {
            const result = await cloudinary.uploader.upload(file.path, {
                public_id: `/${product._id}-Multiple/${product._id}Photo-${
                    imageArray.length + index
                }`,
                folder: "products",
                resource_type: "image",
            });

            return {
                ProductPhotoPerview: result.secure_url,
                cloudinaryId: result.public_id,
            };
        });

        const uploadedImages = await Promise.all(uploadPromises);

        const updatedProduct = await Product.findOneAndUpdate({_id: productId}, {
            $push: {
                imageArray: {$each: uploadedImages},
            },
        });

        res.status(200).json({
            status: "success",
            product: updatedProduct,
        });
    } catch (error) {
        return res.status(500).json({
            status: "fail",
            message: error,
        });
    }
});

exports.deleteMultiplePhoto = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    try {
        const productId = req.params.id;
        const imageId = req.params.imageId;

        await Product.findByIdAndUpdate(productId, {
            $pull: {
                imageArray: {
                    _id: imageId,
                },
            },
        });

        res.status(200).json({
            status: "success",
            message: "Product deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            status: "fail",
            message: "deleting-failed",
        });
    }
});

exports.createProduct = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const userId = req.user.id;

    const {
        name,
        desc,
        price,
        size,
        brand,
        category,
        availabilityCount,
        howToUse,
        highlights,
        color,
        discountedPrice
    } = req.body;

    const product = await Product.create({
        name,
        desc,
        price,
        size,
        brand,
        category,
        availabilityCount,
        howToUse,
        highlights,
        color,
        discountedPrice,
        owner: userId,
    });

    await Category.findByIdAndUpdate(category, {
        $push: {ProductsIds: product.id},
    });

    const owner = await User.findByIdAndUpdate(userId, {
        $push: {productsCreated: product.id},
        $inc: {productCreationAvailability: -1},
    });

    const businussProfile = await BusinussProfile.findOneAndUpdate(
        {user: userId},
        {
            $push: {products: product.id},
        }
    );

    res.status(201).json({
        status: "success",
        data: {
            product,
            owner,
            businussProfile,
        },
    });
});

exports.makeProductTrend = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const userId = req.user.id;
    const productId = req.params.id;

    const user = await User.findById(userId);

    if (user.role === "business" && !user.productsCreated.includes(productId)) {
        return res.status(400).json({
            status: "fail",
            message: "You are not allowed to update this product",
        });
    }

    if (!user.productAds) {
        return next(new AppError("You dont have enough connection", 400));
    }

    await Product.findByIdAndUpdate(productId, {
        $set: {trending: true},
    });

    await User.findByIdAndUpdate(userId, {
        $inc: {productAds: -1},
    });

    res.status(201).json({
        status: "Success",
        message: "Product is now trending",
    });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const userId = req.user.id;
    const productId = req.params.id;

    const user = await User.findById(userId);

    if (user.role === "business" && !user.productsCreated.includes(productId)) {
        return res.status(400).json({
            status: "fail",
            message: "You are not allowed to update this product",
        });
    }

    const {
        name,
        desc,
        price,
        size,
        brand,
        category,
        availabilityCount,
        howToUse,
        highlights,
        color,
        discountedPrice
    } = req.body;

    const product = await Product.findOneAndUpdate({_id: productId}, {
        name,
        desc,
        price,
        size,
        category,
        availabilityCount,
        brand,
        howToUse,
        highlights,
        color,
        discountedPrice
    });

    res.status(201).json({
        status: "success",
        message: "Product updated successfully",
        product
    });
});

exports.searchProduct = factory.search(Product);

exports.deleteProduct = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const userId = req.user.id;
    const productIds = req.params.id;

    const currentProduct = await Product.findById(productIds);

    await Category.findByIdAndUpdate(currentProduct.category, {
        $pull: {ProductsIds: req.params.id},
    });

    await Product.findByIdAndDelete(productIds);

    await User.findByIdAndUpdate(userId, {
        $pull: {productsCreated: productIds},
    });

    res.status(201).json({
        status: "Deleting Success",
    });
});

exports.addToCart = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const userId = req.user.id;
    const {productId, quantity} = req.body;

    const product = await Product.findById(productId);

    if (!product) {
        return next(new AppError("Product not found", 404));
    }

    if (!product.availabilityCount) {
        return next(new AppError("Product is not available in stock", 400));
    }

    if (product.availabilityCount < +quantity) {
        return next(new AppError("Product is not available in stock", 400));
    }

    const user = await User.findById(userId);

    const cartItemIndex = user.cart?.items?.findIndex((el) => el.product.toString() === productId);

    if (cartItemIndex !== -1) {
        user.cart.items[cartItemIndex].quantity = quantity;
    } else {
        user.cart.items.push({
            product: productId,
            quantity: quantity,
        });
    }

    await user.save();

    res.status(200).json({
        status: "success",
        message: "Product added/updated in the cart successfully",
    });
});

exports.removeFromCart = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const {_id} = req.body;
    const userId = req.user.id;

    const cart = req.user.cart.items;

    console.log(cart);

    const cartItemIndex = cart.findIndex((el) => el.product.toString() === _id);

    if (cartItemIndex === -1) {
        return next(new AppError("Product not found in the cart", 404));
    } else {
        cart.splice(cartItemIndex, 1);
    }

    await User.findByIdAndUpdate(userId, {
        $set: {cart: {items: cart}},
    });

    res.status(200).json({
        status: "success",
        message: "Product removed from cart successfully",
    });
});

exports.getIvoices = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
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

    return factory.getAllMagdy(req, res, next, Invoice);
})

exports.getAllTransactions = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
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
    if (req.params.id) filter = {model: req.params.id};
    const count = await Transactions.find();
    const features = new APIFeatures(Transactions.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .Pagination();
    const transactions = await features.query;

    res.status(200).json({
        status: "success",
        results: count.length,
        transactions,
    });
});

exports.getAllInvoices = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
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
    if (req.params.id) filter = {model: req.params.id};
    const count = await Invoice.find();
    const features = new APIFeatures(Invoice.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .Pagination();
    const invoices = await features.query;

    res.status(200).json({
        status: "success",
        results: count.length,
        invoices,
    });
})

exports.getInvoice = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const invoice = await Invoice.findById(req.params.id);

    res.status(200).json({
        status: "Success",
        invoice
    });
});

exports.getTransactionsbyInvoiceId = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const invoiceId = req.params.invoiceId;

    const invoice = await Invoice.findOne({invoiceId});

    const transactions = invoice.transactions

    const transactionsId = transactions.map((el) => el._id.toString());

    const transactionsDetails = await Transactions.find({
        _id: {$in: transactionsId},
    });

    res.status(200).json({
        status: "Success",
        transactionsDetails
    });
});


exports.changeTransactionStatus = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const transactionId = req.params.id;
    const {status} = req.body;

    const transaction = await Transactions.findById(transactionId);

    const transactionOwner = transaction.product.owner._id.toString();
    const transactionsStatus = transaction.status;

    if (transactionOwner !== req.user.id) {
        return next(new AppError("You are not allowed to update this transaction", 400));
    }

    if (transactionsStatus.find((el) => el.status === status)) {
        return next(new AppError("This status has been already added", 400));
    }

    transaction.status.push({
        status: status,
        date: Date.now(),
    });
    await transaction.save();

    res.status(200).json({
        status: "Success",
        message: "Transaction status updated successfully"
    });
});

exports.getMyBusinessOrder = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const userId = req.user.id;


    const business = await BusinussProfile.findOne({user: userId});

    const transactionsId = business.Transactions

    const transactions = await Transactions.find({
        _id: {$in: transactionsId},
    });

    res.status(200).json({
        status: "Success",
        transactions
    });
});

exports.getMyBusinessOrderDetails = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const userId = req.user.id;

    const transactionId = req.params.id;

    const transaction = await Transactions.findOne({
        _id: transactionId,
        // "product.owner._id": userId,
    });

    const transactionOwner = transaction.product.owner._id.toString();

    if (transactionOwner !== userId) {
        return next(new AppError("You are not allowed to update this transaction", 400));
    }

    res.status(200).json({
        status: "Success",
        transaction
    });
})

exports.bussinessGetAdsProduct = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Product']
    const userId = req.user.id;

    const business = await BusinussProfile.findOne({user: userId});

    const productsId = business.products

    const products = await Product.find({
        _id: {$in: productsId},
        promotedAds: { $gt: 0 },
        adsExpireDate: { $gt: Date.now() }
    });

    res.status(200).json({
        status: "Success",
        products
    });
});