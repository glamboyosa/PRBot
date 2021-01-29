import { Schema, model } from 'mongoose';
const schema = new Schema({
  channelId: {
    type: String,
    required: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
});
export default model('Bot', schema);
