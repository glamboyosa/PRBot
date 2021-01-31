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
  user: {
    type: String,
    required: true,
  },
  urls: {
    type: [{ url: String }],
  },
});
export default model('Bot', schema);
