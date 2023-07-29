const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
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
    availabilityCount: Number,
    howToUse: {
        type: String,
        required: [true, 'Must be not Empty !'],
        trim: true,
    },
    highlights: [{
        type: String,
        required: [true, 'Must be not Empty !'],
        enum: ["High Shine Finish", "Hydrating"],
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


productSchema.post(/^find/, function (docs, next) {
    console.log(`Query took ${Date.now() - this.start} millisecond!`);
    next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;