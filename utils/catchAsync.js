module.exports = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch((error) => {
            if (error.name === "ValidationError") {
                let errors = {};

                const message = error.message

                Object.keys(error.errors).forEach((key) => {
                    errors[key] = error.errors[key].message;
                });

                return res.status(400).json({
                    success: false,
                    message,
                    errors
                });
            } else {
                return next()
            }
        });
    };
};