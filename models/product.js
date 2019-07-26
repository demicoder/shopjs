const getDb = require('../util/db').getDb;

class Product {
  constructor(name, price, description, imageUrl) {
    this.name = name;
    this.price = +price;
    this.description = description;
    this.imageUrl = imageUrl;
  }


  save() {
    const db = getDb();
    return db.collection('products').insertOne(this)
      .then(result => console.log(result))
      .catch(err => console.log(err));
  }

  static fetchAll() {
    const db = getDb();
    return db.collection('products').find().toArray()
      .then(products => {
        console.log(products);
        return products;
      })
      .catch(err => console.log(err));
  }


}


module.exports = Product;