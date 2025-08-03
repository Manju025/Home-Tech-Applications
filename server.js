require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

console.log("🟢 Starting server...");
console.log("🔐 MONGO_URI:", !!MONGO_URI);

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = ['https://hometechapp.netlify.app'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const productSchema = new mongoose.Schema({
  id: Number,
  name: String,
  price: Number,
  image: String,
  tags: [String],
  isNewLaunch: Boolean,
  capacity: String,
  warranty: String
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  id: String,
  productId: Number,
  productName: String,
  quantity: Number,
  customerName: String,
  customerPhone: String,
  customerAddress: String,
  specialInstructions: String,
  orderDate: String,
  total: Number,
  status: { type: String, enum: ['Pending', 'Done'], default: 'Pending' },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema, 'products');
const Order = mongoose.model('Order', orderSchema);

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  console.log("📥 Incoming product data:", req.body); // DEBUG LOG
  const product = new Product(req.body);
  try {
    const saved = await product.save();
    console.log("✅ Product saved:", saved); // DEBUG LOG
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Error saving product:", err);
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await Product.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const order = new Order(req.body);
  try {
    const saved = await order.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.status = req.body.status;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ✅ Catch-all health route (to avoid random /: path errors)
app.get('/', (req, res) => {
  res.send('✅ Home Tech API is running!');
});

app.get('*', (req, res) => {
  res.status(404).send('🚫 Route not found');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
