const mongoose = require('mongoose')
const validator = require('validator')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    discountPercentage: {
        type: Number,
        default: 0,
        max: 80,
    },
    brand: {
        type: String,
        default: "Exxample",
        trim: true,
    },
    discountedPrice: {
        type: Number,
        default: 0
    },
    desc: {
        type: String,
        required: [true, 'A product must have a description'],
        trim: true,
    },
    ProductPhoto: String,
    cloudinaryId: String,
    imageArray: [
        {
            ProductPhotoPerview: String,
            cloudinaryId: String,
        },
    ],
    availabilityCount: {
        type: Number,
        default: 1,
    },
    color: [{
        type: String,
        required: [true, 'Must be not Empty !'],
        validate: [validator.isHexColor, "Please enter valid hex color code"],
    }],
    howToUse: {
        type: String,
        required: [true, 'Must be not Empty !'],
        trim: true,
    },
    highlights: [{
        type: String,
        required: [true, 'Must be not Empty !'],
        trim: true,
    }],
    size: {
        type: String,
        required: true,
        enum: ['Gift Set', 'Mini', 'Refill', 'Value',],
    },
    trending: {
        type: Boolean,
        default: false,
    },
    favouriteCount: {
        type: Number,
        default: 0,
    },
    promotedAds: {
        type: Number,
        default: 0
    },
    adsExpireDate: {
        type: Date,
        default: Date.now(),
    },
    isFavorite : {
        type: Boolean,
        default: false,
    },
    ratingsAverage: {
        type: Number,
        default: 1,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be less 5.0'],
        set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
        type: Number,
        default: 0,
    },
    Reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
    }],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    voucher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voucher'
    },
});

productSchema.index({ price: 1, ratingsAverage: -1 });

productSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'product',
    localField: '_id',
});

productSchema.pre(/^find/, function (next) {

    this.populate({
        path: 'category',
        select: 'name',
    }).populate({
        path: 'owner',
        select: 'stockName',
    })

    next();
});


productSchema.post(/^find/, function (docs, next) {
    console.log(`Query took ${Date.now() - this.start} millisecond!`);
    next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;