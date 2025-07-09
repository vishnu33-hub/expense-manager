const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.SECRET || "your_secret_key";

// ✅ CORS Configuration
const allowedOrigins = [
  'https://expense-manager-8tm8.onrender.com',   // ✅ Your deployed frontend
  'http://localhost:5000',                       // ✅ Localhost for development
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ Handle Preflight requests globally
app.options('*', cors());

// ✅ Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ MongoDB Connection
mongoose.connect('mongodb+srv://root:Vishnu337@cluster-1.npfnnmp.mongodb.net/expenseManager')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ✅ Schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});

const expenseSchema = new mongoose.Schema({
  person: String,
  date: String,
  category: String,
  amount: Number,
  paid: { type: Boolean, default: false },
  paymentId: String
});

const User = mongoose.model('User', userSchema);
const Expense = mongoose.model('Expense', expenseSchema);

// ✅ JWT Middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ✅ SEO-Friendly Routes
app.get('/', (req, res) => res.redirect('/signin'));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/signin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signin.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));

// ✅ Auth Routes
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await new User({ name, email, password: hashedPassword }).save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ email: user.email, name: user.name }, SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Signin failed' });
  }
});

// ✅ Expense Routes
app.post('/api/expenses', verifyToken, async (req, res) => {
  try {
    const newExpense = new Expense(req.body);
    await newExpense.save();
    res.send(newExpense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

app.get('/api/expenses', verifyToken, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.send(expenses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.post('/api/expenses/:id/paid', verifyToken, async (req, res) => {
  try {
    const { paymentId } = req.body;
    await Expense.findByIdAndUpdate(req.params.id, { paid: true, paymentId });
    res.send({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

app.delete('/api/expenses/:id', verifyToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    if (expense.paid) return res.status(400).json({ error: 'Cannot delete paid expenses' });

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
