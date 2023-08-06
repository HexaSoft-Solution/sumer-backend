const User = require('../models/userModel');
const Product = require('../models/productModel');
const Transaction = require('../models/transactionModel');
const Invoice = require('../models/invoiceModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const moyasar = require('../utils/moyasar');

const axios = require('axios');

const getProductDetails = async (productId) => {
    return await Product.findById(productId);
};

const generateRandomInvoiceId = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
};

exports.viewCart = catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const user = await User.findById(userId)

    const cart = user.cart

    const cartDetails = [];
    let totalPrice = 0;

    for (const item of cart) {
        const product = await getProductDetails(item.product);
        const totalPriceForProduct = product.price * item.quantity;
        totalPrice += totalPriceForProduct;

        cartDetails.push({
            Product: product,
            quantity: item.quantity,
            totalPriceForProduct: totalPriceForProduct,
        });
    }

    res.status(200).json({
        status: 'success',
        cartDetails: cartDetails,
        totalPriceForAllProducts: totalPrice,
    });
})

exports.checkout = catchAsync(async (req, res, next) => {
    const cart = req.user.cart;
    const userId = req.user._id;

    let totalCartAmount = 0;
    const metadataArray = [];
    for (const item of cart) {
        const product = await Product.findById(item.product);
        if (product.availabilityCount < item.quantity) {
            return next(new AppError(`Product ${product.name} is out of stock.`, 400));
        }
        const totalPriceForProduct = product.price * item.quantity;
        totalCartAmount += totalPriceForProduct;

        const metadata = {
            productName: product.name,
            quantity: item.quantity,
            price: product.price,
        };
        metadataArray.push(metadata);
    }

    const transactionIds = [];
    for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const transaction = new Transaction({
            product: item.product,
            quantity: item.quantity,
            price: metadataArray[i].price,
            user: userId,
        });
        await transaction.save();
        transactionIds.push(transaction._id);
    }

    const {
        type,
        number,
        name,
        cvc,
        month,
        year,
    } = req.body;

    const source = { type, number, name, cvc, month, year };

    const invoiceId = generateRandomInvoiceId();
    const payment = await moyasar.createPayment(totalCartAmount, 'Cart payment', source, metadataArray, invoiceId, req.protocol, req.get('host'), "buyProduct");

    const invoice = new Invoice({
        invoiceId: invoiceId,
        transactions: transactionIds,
        totalAmount: totalCartAmount,
        user: userId,
        paymentIds: [payment.id],
    });
    await invoice.save();

    res.status(200).json({
        status: 'success',
        message: 'Checkout successful!',
        invoiceId: invoiceId,
        totalCartAmount: totalCartAmount,
        paymentId: payment.id,
        callback_url: payment.callback_url,
        payment: payment.source.transaction_url
    });
});

exports.paymentCallback = catchAsync(async (req, res, next) => {
    const paymentId = req.query.id;
    const payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === 'paid') {

        const invoiceId = req.params.invoice_id;

        const invoice = await Invoice.findOneAndUpdate(
            {invoiceId: invoiceId},
            {paymentIds: paymentId},
            {new: true}
        );

        const transactionsArr = invoice.transactions
        for (const transactionId of transactionsArr) {
            const transaction = await Transaction.findById(transactionId);
            await Product.findOneAndUpdate({ _id: transaction.product }, { $inc: { availabilityCount: -transaction.quantity } }, { new: true })
        }

        const transactions = await Transaction.find({_id: {$in: invoice.transactions}});
        for (const transaction of transactions) {
            transaction.paymentId = paymentId;
            await transaction.save();
        }

        res.status(200).json({status: 'success', message: 'Payment processed successfully.'});
    } else {
        res.status(400).json({ status: 'error', message: 'Payment failed or not yet paid.' });
    }
});

exports.buyProductConnections = catchAsync(async (req, res, next) => {
    const {
        type,
        number,
        name,
        cvc,
        month,
        year,
    } = req.body;

    const source = { type, number, name, cvc, month, year };

    const payment = await moyasar.createPayment(40, 'Buy Product Connections', source, [], "0", req.protocol, req.get('host'), "buyProductConnections");

    res.status(200).json({
        status: 'success',
        message: 'Checkout successful!',
        paymentId: payment.id,
        callback_url: payment.callback_url,
        payment: payment.source.transaction_url
    });
});

exports.verifyBuyConnection = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const paymentId = req.query.id;
    const payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === 'paid') {

        await User.findByIdAndUpdate(userId,
            {
                $inc: { connections: 10, productAds: 2 },
            }, { new: true }
        );

        res.status(200).json({status: 'success', message: 'Payment processed successfully.'});
    } else {
        res.status(400).json({ status: 'error', message: 'Payment failed or not yet paid.' });
    }
});
