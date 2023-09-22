const Withdraw = require('../models/withdrawRequestModel');
const BusinessProfile = require('../models/businessProfileModel');
const Salon = require('../models/salonModel');
const Consultation = require('../models/consultationModel');

const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');

const paypal = require('@paypal/payouts-sdk');

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_SECRET_KEY;
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

exports.getAllRequestes = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Withdraw']
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
        const count = await Withdraw.find();
        const features = new APIFeatures(Withdraw.find(filter), req.query)
            .filter()
            .sort()
            .limitFields()
            .Pagination();
        const withraws = await features.query;
    
        res.status(200).json({
            status: "success",
            results: count.length,
            withraws,
        });
});

exports.createWithdrawRequest = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Withdraw']
    const { price, paypalEmail } = req.body;

    if (req.user.BusinussProfile) {
        const businussProfile = await BusinessProfile.findById(req.user.BusinussProfile);
        
        if (businussProfile.balance < price) {
            return next(new AppError('You dont have enough money to withdraw', 400));
        }

        const withdraw = await Withdraw.create({
            userId: businussProfile.id,
            paypalEmail,
            userType: 'Business',
            price,
            status: 'Pending',
        });

        businussProfile.withdrawRequestes.push(withdraw.id);
        await businussProfile.save();

        res.status(201).json({
            status: 'success',
            withdraw,
        });
    } else if (req.user.salonCreated) {
        const salon = await Salon.findById(req.user.salonCreated);

        if (salon.balance < price) {
            return next(new AppError('You dont have enough money to withdraw', 400));
        }

        const withdraw = await Withdraw.create({
            userId: salon.id,
            paypalEmail,
            userType: 'Salon',
            price,
            status: 'Pending',
        });

        salon.withdrawRequestes.push(withdraw.id);
        await salon.save();

        res.status(201).json({
            status: 'success',
            withdraw,
        });
    } else if (req.user.consultation) {
        const  consultation = await Consultation.findById(req.user.consultation);

        if (consultation.balance < price) {
            return next(new AppError('You dont have enough money to withdraw', 400));
        }

        const withdraw = await Withdraw.create({
            userId: consultation.id,
            paypalEmail,
            userType: 'Consultation',
            price,
            status: 'Pending',
        });

        consultation.withdrawRequestes.push(withdraw.id);
        await consultation.save();

        res.status(201).json({
            status: 'success',
            withdraw,
        });
    }else{
         return next(new AppError('Error', 500));
    }
})

exports.acceptRequest = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Withdraw']
    const requestId = req.params.id;

    const withdrawRequest = await Withdraw.findById(requestId);

    if (!withdrawRequest) {
        return next(new AppError('No request found with that ID', 404));
    }

    if (withdrawRequest.status !== 'Pending') {
        return next(new AppError('This request is already accepted', 400));
    }

    if (withdrawRequest.userType === 'Business') {
        const businussProfile = await BusinessProfile.findById(withdrawRequest.userId);

        if (businussProfile.balance < withdrawRequest.price) {
            withdrawRequest.status = 'Failed';
            await withdrawRequest.save();
            return next(new AppError('You dont have enough money to withdraw \nYour Request is Failed !!', 400));
        }
    }

    if (withdrawRequest.userType === 'Salon') {
        const salon = await Salon.findById(withdrawRequest.userId);

        if (salon.balance < withdrawRequest.price) {
            withdrawRequest.status = 'Failed';
            await withdrawRequest.save();
            return next(new AppError('You dont have enough money to withdraw \nYour Request is Failed !!', 400));
        }
    }

    if (withdrawRequest.userType === 'Consultation') {
        const consultation = await Consultation.findById(withdrawRequest.userId);

        if (consultation.balance < withdrawRequest.price) {
            withdrawRequest.status = 'Failed';
            await withdrawRequest.save();
            return next(new AppError('You dont have enough money to withdraw \nYour Request is Failed !!', 400));
        }
    }

    let request = new paypal.payouts.PayoutsPostRequest();
    request.headers['prefer'] = 'return=representation';
    request.requestBody({
        sender_batch_header: {
            email_subject: 'You have a payment'
        },
        items: [{
            recipient_type: 'EMAIL',
            receiver: withdrawRequest.paypalEmail,
            note: 'Payment for service',
            sender_item_id: 'item-id',
            amount: {
                currency: 'USD',
                value: withdrawRequest.price * 0.24
            }
        }]
    });

    client.execute(request).then(async (response) => {
        withdrawRequest.status = 'Success';
        await withdrawRequest.save();

        if (withdrawRequest.userType === 'Business') {
            const businussProfile = await BusinessProfile.findById(withdrawRequest.userId);
            businussProfile.balance -= withdrawRequest.price;
            await businussProfile.save();

            res.status(200).json({
                status: 'success',
                message: 'Your Request is Accepted !!',
                businussProfile,
                Payout: response.result,
            });
        } else if (withdrawRequest.userType === 'Salon') {
            const salon = await Salon.findById(withdrawRequest.userId);
            salon.balance -= withdrawRequest.price;
            await salon.save();

            res.status(200).json({
                status: 'success',
                message: 'Your Request is Accepted !!',
                salon,
                Payout: response.result,
            });
        } else if (withdrawRequest.userType === 'Consultation') {
            const consultation = await Consultation.findById(withdrawRequest.userId);
            consultation.balance -= withdrawRequest.price;
            await consultation.save();

            res.status(200).json({
                status: 'success',
                message: 'Your Request is Accepted !!',
                consultation,
                Payout: response.result,
            });
        } else {
            return next(new AppError('Something went wrong', 400));
        }
    }).catch((error) => {
        res.status(400).json({
            status: 'fail',
            error,
        });
    });
});

exports.rejectWithdrawRequest = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Withdraw']
    const requestId = req.params.id;

    const request = await Withdraw.findOneAndUpdate(
        { _id: requestId },
        { status: 'Failed' },
    );

    if (!request) {
        return next(new AppError('No request found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        request,
    });
});