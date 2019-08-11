const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    cart: {
        items: [{
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }]
    },
    date: {
        type: Date,
        default: Date.now
    }
});


userSchema.methods.addToCart = function (product) {

    const cartProductIndex = this.cart.items.findIndex(cartProduct => cartProduct.productId.toString() === product._id.toString());

    let newQuantity = 1;
    const updatedCart = [...this.cart.items];

    if (cartProductIndex >= 0) {
        newQuantity = this.cart.items[cartProductIndex].quantity + 1;
        updatedCart[cartProductIndex].quantity = newQuantity;
    } else {
        updatedCart.push({
            productId: product._id,
            quantity: newQuantity
        });
    }

    this.cart.items = updatedCart;

    return this.save();

};


module.exports = mongoose.model('User', userSchema);