import mongoose from 'mongoose';

const strategySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Strategy title is required.'],
      trim: true,
      maxlength: [80, 'Strategy title must be at most 80 characters.'],
      unique: true,
      index: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: [2000, 'Strategy details must be at most 2000 characters.'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : undefined;
        return ret;
      },
    },
  }
);

const Strategy = mongoose.model('Strategy', strategySchema);
export default Strategy;
