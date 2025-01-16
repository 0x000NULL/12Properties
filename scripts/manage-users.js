#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to MongoDB
async function connectDB() {
  try {
    // First, check if database already exists with any case
    const client = await mongoose.connect('mongodb://127.0.0.1:27017/admin', {
      family: 4
    });
    
    const adminDb = client.connection.db;
    const databases = await adminDb.admin().listDatabases();
    const dbExists = databases.databases.some(
      db => db.name.toLowerCase() === '12properties'
    );
    
    // Disconnect from admin database
    await mongoose.disconnect();
    
    // Connect to the correct database, using existing one if found
    let dbName = '12properties';
    if (dbExists) {
      // Find the actual name with correct case
      dbName = databases.databases.find(
        db => db.name.toLowerCase() === '12properties'
      ).name;
    }
    
    // Update the connection URI with the correct database name
    const uri = `mongodb://127.0.0.1:27017/${dbName}`;
    console.log(`Connecting to database: ${dbName}`);
    
    await mongoose.connect(uri, {
      family: 4  // Force IPv4
    });
    
    console.log('Connected to MongoDB successfully');
    console.log('Database:', mongoose.connection.name);
    
    // Initialize the users collection if it doesn't exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('Current collections:', collectionNames);
    
    if (!collectionNames.includes('users')) {
      console.log('\nInitializing users collection...');
      try {
        // Check if collection exists with different case
        const collectionExists = collectionNames.some(
          name => name.toLowerCase() === 'users'
        );
        
        if (collectionExists) {
          console.log('Collection already exists with different case');
          return;
        }
        
        await mongoose.connection.db.createCollection('users');
        // Create unique index on email
        await mongoose.connection.db.collection('users').createIndex(
          { email: 1 }, 
          { unique: true }
        );
        console.log('Users collection initialized');
      } catch (error) {
        console.error('Error initializing collection:', error.message);
      }
    } else {
      console.log('Users collection already exists');
    }
    
    console.log('Collections:', await mongoose.connection.db.listCollections().toArray());
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (err.message.includes('different case')) {
      console.log('\nDatabase case sensitivity issue detected.');
      console.log('Please drop the existing database and try again:');
      console.log('1. Open MongoDB shell: mongosh');
      console.log('2. Switch to the database: use 12Properties');
      console.log('3. Drop the database: db.dropDatabase()');
      console.log('4. Exit MongoDB shell: exit');
      console.log('5. Run this script again\n');
    } else {
      console.log('\nPlease make sure MongoDB is installed and running:');
      console.log('1. Install MongoDB: https://www.mongodb.com/try/download/community');
      console.log('2. Start MongoDB service:');
      console.log('   - Windows: Open Services and start MongoDB');
      console.log('   - Mac/Linux: sudo service mongod start');
      console.log('3. Verify MongoDB is running on port 27017\n');
    }
    process.exit(1);
  }
}

// Prompt user for input
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// List all users
async function listUsers() {
  try {
    console.log('\nQuerying database...');
    const count = await User.countDocuments();
    console.log(`Found ${count} users in database`);
    
    const users = await User.find({}, '-password');
    if (users.length === 0) {
      console.log('\nNo users found in database. Try creating one first.');
      return;
    }
    
    console.log('\nCurrent Users:');
    console.table(users.map(user => ({
      ID: user._id,
      Name: user.name,
      Email: user.email,
      Phone: user.phone,
      Role: user.role,
      Created: user.createdAt
    })));
  } catch (err) {
    console.error('Error listing users:', err);
    console.log('\nDatabase name:', mongoose.connection.name);
    console.log('Collection name:', User.collection.name);
  }
}

// Create a new user
async function createUser() {
  try {
    console.log('\nCreate New User:');
    
    const name = await question('Name: ');
    if (!name) throw new Error('Name is required');

    const email = await question('Email: ');
    if (!isValidEmail(email)) throw new Error('Invalid email format');

    const password = await question('Password: ');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');

    const phone = await question('Phone: ');
    if (!phone) throw new Error('Phone is required');

    const role = await question('Role (realtor/admin): ');
    if (!['realtor', 'admin'].includes(role)) throw new Error('Invalid role');

    const user = new User({
      name,
      email,
      password,
      phone,
      role
    });

    console.log('\nAttempting to save user...');
    await user.save();
    console.log('User document:', user.toObject());
    console.log('\nUser created successfully!');
    
    // Verify the user was saved
    const savedUser = await User.findOne({ email });
    if (savedUser) {
      console.log('Verified: User exists in database');
    } else {
      console.log('Warning: User was not found after saving');
    }
    
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.code === 11000) {
      console.log('\nError: Email already exists in database');
    }
  }
}

// Modify existing user
async function modifyUser() {
  try {
    await listUsers();
    const email = await question('\nEnter email of user to modify: ');
    
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    console.log('\nLeave blank to keep current value:');
    
    const name = await question(`Name (${user.name}): `);
    const newEmail = await question(`Email (${user.email}): `);
    const password = await question('New Password (leave blank to keep current): ');
    const phone = await question(`Phone (${user.phone}): `);
    const role = await question(`Role (${user.role}): `);

    if (name) user.name = name;
    if (newEmail && isValidEmail(newEmail)) user.email = newEmail;
    if (password) user.password = password;
    if (phone) user.phone = phone;
    if (role && ['realtor', 'admin'].includes(role)) user.role = role;

    await user.save();
    console.log('\nUser modified successfully!');
    
  } catch (err) {
    console.error('Error modifying user:', err.message);
  }
}

// Delete user
async function deleteUser() {
  try {
    await listUsers();
    const email = await question('\nEnter email of user to delete: ');
    
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const confirm = await question(`Are you sure you want to delete ${user.name}? (yes/no): `);
    if (confirm.toLowerCase() === 'yes') {
      await User.deleteOne({ _id: user._id });
      console.log('\nUser deleted successfully!');
    } else {
      console.log('\nDeletion cancelled');
    }
    
  } catch (err) {
    console.error('Error deleting user:', err.message);
  }
}

// Main menu
async function showMenu() {
  while (true) {
    console.log('\n=== User Management System ===');
    console.log('1. List Users');
    console.log('2. Create User');
    console.log('3. Modify User');
    console.log('4. Delete User');
    console.log('5. Verify Database Connection');
    console.log('6. Exit');

    const choice = await question('\nSelect an option (1-6): ');

    switch (choice) {
      case '1':
        await listUsers();
        break;
      case '2':
        await createUser();
        break;
      case '3':
        await modifyUser();
        break;
      case '4':
        await deleteUser();
        break;
      case '5':
        console.log('\nVerifying database connection...');
        console.log('Database:', mongoose.connection.name);
        console.log('Connected:', mongoose.connection.readyState === 1);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        break;
      case '6':
        console.log('\nGoodbye!');
        rl.close();
        mongoose.connection.close();
        process.exit(0);
      default:
        console.log('\nInvalid option, please try again');
    }
  }
}

// Start the application
connectDB().then(showMenu); 