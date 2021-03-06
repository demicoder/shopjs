const fs = require('fs');
const path = require('path');


const PDFdocument = require('pdfkit');

const stripe = require('stripe')('STRIPE SECRET KEY');


const Product = require('../models/product');
const Order = require('../models/order');
const ITEMS_PER_PAGE = 12;



exports.getIndex = (req, res, next) => {

	const page = +req.query.page || 1;
	let totalProducts;

	Product.find()
		.countDocuments()
		.then(numProducts => {
			totalProducts = numProducts;
			return Product.find()
				.skip((page - 1) * ITEMS_PER_PAGE)
				.limit(ITEMS_PER_PAGE)
		})
		.then((products) => {
				res.render('shop/index', {
					products,
					pageTitle: 'Home',
					activeLink: '/',
					currentPage: page,
					hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
					hasPreviousPage: page > 1,
					nextPage: page + 1,
					previousPage: page - 1,
					lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE)
				});
			}

		)
		.catch(err => {
			console.log(err);
		});
}


exports.getProducts = (req, res, next) => {
	const page = +req.query.page || 1;
	let totalProducts;

	Product.find()
		.countDocuments()
		.then(numProducts => {
			totalProducts = numProducts;
			return Product.find()
				.skip((page - 1) * ITEMS_PER_PAGE)
				.limit(ITEMS_PER_PAGE)
		})
		.then(products => {
			res.render('shop/product-list', {
				products,
				pageTitle: 'Products',
				activeLink: '/products',
				currentPage: page,
				hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
				hasPreviousPage: page > 1,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE)
			})
		})
		.catch(err => {
			console.log(err);
		})
}


exports.getProduct = (req, res, next) => {
	const id = req.params.id;
	Product.findById(id)
		.then(product => {
			res.render('shop/product-detail', {
				product,
				pageTitle: product.name,
				activeLink: '/products'
			});

		})
		.catch(err => {
			console.log(err);
		});

}

exports.postCartDeleteProduct = (req, res, next) => {

	const productId = req.body.productId;

	req.user.deleteFromCart(productId)
		.then(result => {
			res.redirect('back');
		})
		.catch(err => {
			console.log(err);
		});
};



exports.getCart = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then(user => {
			res.render('shop/cart', {
				activeLink: '/cart',
				pageTitle: 'Cart',
				products: user.cart.items
			});
		})
		.catch(err => {
			console.log(err);
		});
}


exports.postCart = (req, res, next) => {

	const productId = req.body.product;
	return Product.findById(productId)
		.then(product => {
			return req.user.addToCart(product);
		})
		.then(() => res.redirect('/cart'))
		.catch(err => {
			console.log(err);
		});

}

exports.getOrders = (req, res, next) => {

	Order.find({
			'user.id': req.user._id
		})
		.then(orders => {
			res.render('shop/orders', {
				activeLink: '/orders',
				pageTitle: 'Your Orders',
				orders
			});
		})
		.catch(err => {
			console.log(err);
		});
};

exports.getCheckout = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then(user => {
			let totalSum = 0;
			const products = user.cart.items;
			products.forEach(prod => {
				totalSum += prod.quantity * prod.productId.price;
			});
			res.render('shop/checkout', {
				activeLink: '/checkout',
				pageTitle: 'Checkout',
				products,
				totalSum
			});
		})
		.catch(err => {
			console.log(err);
		});







}

exports.postOrder = (req, res, next) => {

	const token = req.body.stripeToken;

	let amount = 0;


	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then(user => {

			user.cart.items.forEach(prod => {
				amount += prod.quantity * prod.productId.price
			});

			// Map products on User document to product
			const products = user.cart.items.map(product => {
				return {
					quantity: product.quantity,
					product: {
						...product.productId._doc
					}
				};
			});

			const order = new Order({
				products,
				user: {
					email: req.user.email,
					id: req.user
				}
			});

			return order.save();
		})
		.then(result => {
			const charge = stripe.charges.create({
				amount: amount * 100,
				currency: 'usd',
				source: token,
				description: 'Demo order',
				metadata: {
					order_id: result._id.toString()
				}
			});
			req.user.emptyCart()
		})
		.then(() => res.redirect('/orders'))
		.catch(err => {
			console.log(err);
		});
}


exports.getReceipt = (req, res, next) => {

	const orderId = req.params.orderId;

	Order.findOne({
			_id: orderId,
			'user.id': req.user._id
		})
		.then(order => {
			if (!order) {
				return res.redirect('/');
			}

			const receiptName = 'receipt-' + orderId + '.pdf';
			const receiptPath = path.join('data', 'receipts', receiptName);

			const pdf = new PDFdocument();
			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader('Content-Disposition', 'attachment;filename="' + receiptName + '"');
			pdf.pipe(fs.createWriteStream(receiptPath));
			pdf.pipe(res);

			pdf.fontSize(20).text('Receipt');
			pdf.text('__________________________________________');
			pdf.text(' ');


			let totalPrice = 0;

			order.products.forEach(prod => {

				totalPrice += prod.quantity * prod.product.price;

				pdf.fontSize(14).text(
					prod.product.name +
					' - Qty: ' +
					prod.quantity +
					' x  $' +
					prod.product.price
				);

			});

			pdf.text('___');
			pdf.text(' ');
			pdf.fontSize(18).text('Total: $' + totalPrice);
			pdf.end();

		});

}