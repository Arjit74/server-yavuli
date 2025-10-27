const userService = require('../services/userService');
const AppError = require('../utils/appError');

// Sign up a new user
exports.signup = async (req, res, next) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return next(new AppError('Please provide email, password, and name', 400));
        }

        const { user, session, error } = await userService.signUp(email, password, { name });
        
        if (error) throw error;

        res.status(201).json({
            status: 'success',
            data: {
                user,
                session
            }
        });
    } catch (err) {
        next(new AppError(err.message, 400));
    }
};

// Login user
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError('Please provide email and password!', 400));
        }

        const { user, session, error } = await userService.signIn(email, password);
        
        if (error) throw error;

        res.status(200).json({
            status: 'success',
            data: {
                user,
                session
            }
        });
    } catch (err) {
        next(new AppError('Incorrect email or password', 401));
    }
};

// Get current user
exports.getMe = async (req, res, next) => {
    try {
        const user = await userService.getUser();
        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        });
    } catch (err) {
        next(new AppError('Not authorized', 401));
    }
};

// Logout user
exports.logout = async (req, res, next) => {
    try {
        await userService.signOut();
        res.status(200).json({
            status: 'success',
            message: 'Successfully logged out'
        });
    } catch (err) {
        next(new AppError('Error logging out', 500));
    }
};

// Middleware to protect routes
exports.protect = async (req, res, next) => {
    try {
        const session = await userService.getSession();
        if (!session) {
            return next(new AppError('You are not logged in! Please log in to get access.', 401));
        }
        
        const user = await userService.getUser();
        if (!user) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        req.user = user;
        next();
    } catch (err) {
        next(new AppError('Not authorized to access this route', 401));
    }
};

// Restrict certain routes to specific roles
exports.restrictTo = (...roles) => {
    return async (req, res, next) => {
        try {
            const user = await userService.getUser();
            if (!roles.includes(user.role)) {
                return next(new AppError('You do not have permission to perform this action', 403));
            }
            next();
        } catch (err) {
            next(new AppError('Error checking user permissions', 500));
        }
    };
};
