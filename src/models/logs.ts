import { Schema, model } from 'mongoose';
const schema = new Schema({
  from: {
    type: String,
    required: true,
  },
  error: {
    type: String,
    required: true,
  },
});
export default model('Log', schema);
