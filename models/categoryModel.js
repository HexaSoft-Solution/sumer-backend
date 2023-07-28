const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
        name: {
            type: String,
            required: [true, 'A category must have a name'],
            unique: true,
            trim: true,
        },
        desc: {
            type: String,
            required: [true, 'A category must have a description'],
            trim: true,
        },
        ProductsIds: {
            type: [{
                type: mongoose.Schema.ObjectId,
                ref: 'Product'
            }]
        },
        CategoryPhoto: String,
        cloudinaryId: String,
        createdAt: {
            type: Date,
            default: Date.now()
        },
        modifiedAt: {
            type: Date,
        },
        deletedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    });

const Category = mongoose.model('Category', CategorySchema);

module.exports = Category;