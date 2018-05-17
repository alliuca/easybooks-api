const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
}, { collection: 'users' });

const ModelClass = mongoose.model('User', userSchema);

module.exports = ModelClass;
