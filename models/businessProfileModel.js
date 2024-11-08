const mongoose = require ('mongoose');

const BusinessProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: []
    }],
    balance: {
        type: Number,
        default: 0
    },
    Transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'transaction',
        default: [],
    }],
    promotedAdsCount: {
        type: Number,
        default: 0
    },
    withdrawRequestes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'withdraw-requests',
    }],
    vouchers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'voucher',
    }],
})

BusinessProfileSchema.pre(/^find/, function (next) {
    this.populate('withdrawRequestes');
    next();
});

BusinessProfileSchema.pre('save', async function (next) {
    try {
        const totalPromotedAdsCount = await this.model('Product')
            .find({ _id: { $in: this.products } })
            .select('promotedAds')
            .then(products => products.reduce((acc, product) => acc + product.promotedAds, 0));

        // Update the 'promotedAdsCount' field in the BusinessProfile document
        this.promotedAdsCount = totalPromotedAdsCount;

        next();
    } catch (error) {
        next(error);
    }
});

const BusinessProfile = mongoose.model('businessProfile', BusinessProfileSchema);

module.exports = BusinessProfile;