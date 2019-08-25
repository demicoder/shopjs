const {
    check,
    body
} = require('express-validator');

const User = require('../models/user');

const PASSWORD_MIN_LENGTH = 6;

exports.signUp = [
    check('email').isEmail().withMessage('Enter a valid E-mail')
    .custom((value, {
        req
    }) => {
        return User.findOne({
            email: value
        }).then(userDoc => {
            if (userDoc) {
                throw new Error('Passwords have to match!');
            }
        });
    }),
    body('password').isLength({
        min: PASSWORD_MIN_LENGTH
    }).withMessage('Password must be more than 5 characters'),
    body('confirmPassword').custom((value, {
        req
    }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords have to match!');
        }
        return true;
    })
]

exports.login = [
    check('email').isEmail()
    .withMessage('Enter a valid E-mail'),
];