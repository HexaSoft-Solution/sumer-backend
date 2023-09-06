const mongoose = require ('mongoose');

const BusinessProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
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
})

BusinessProfileSchema.pre('save', async function (next) {
    try {
        const totalPromotedAdsCount = await this.model('product')
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