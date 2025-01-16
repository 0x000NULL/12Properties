#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');
const Property = require('../models/Property');

// Sample property data
const properties = [
  {
    title: "Oceanfront Villa",
    description: "Luxurious oceanfront villa featuring stunning views, premium finishes, and exclusive amenities. This spectacular property offers the perfect blend of indoor and outdoor living with direct beach access.",
    location: "Malibu, California",
    price: 12500000,
    beds: 6,
    baths: 8,
    sqft: 8500,
    features: [
      "Private Beach Access",
      "Infinity Pool",
      "Wine Cellar",
      "Home Theater",
      "Smart Home Technology",
      "4-Car Garage"
    ]
  },
  {
    title: "Modern Penthouse",
    description: "Spectacular penthouse with panoramic city views, featuring floor-to-ceiling windows and premium finishes throughout. This urban oasis offers the ultimate in luxury city living.",
    location: "Manhattan, New York",
    price: 8900000,
    beds: 4,
    baths: 4.5,
    sqft: 4200,
    features: [
      "Private Elevator",
      "Rooftop Terrace",
      "Chef's Kitchen",
      "Smart Home System",
      "24/7 Concierge",
      "Wine Room"
    ]
  },
  {
    title: "Mediterranean Estate",
    description: "Magnificent Mediterranean estate set on manicured grounds, offering the perfect blend of luxury and comfort. This stunning property features exceptional craftsmanship and attention to detail.",
    location: "Beverly Hills, California",
    price: 15750000,
    beds: 8,
    baths: 10,
    sqft: 12000,
    features: [
      "Guest House",
      "Tennis Court",
      "Pool & Spa",
      "Wine Cellar",
      "Home Theater",
      "6-Car Garage"
    ]
  }
];

// Function to copy sample images
async function copySampleImages() {
  const sourceDir = path.join(__dirname, 'sample-images');
  const targetDir = path.join(__dirname, '..', 'public', 'images', 'properties');
  
  try {
    // Create target directory if it doesn't exist
    await fs.mkdir(targetDir, { recursive: true });
    
    // Copy each image
    const images = await fs.readdir(sourceDir);
    for (const image of images) {
      await fs.copyFile(
        path.join(sourceDir, image),
        path.join(targetDir, image)
      );
    }
    
    return images.map(image => `/images/properties/${image}`);
  } catch (err) {
    console.error('Error copying images:', err);
    throw err;
  }
}

// Initialize database
async function initializeDatabase() {
  try {
    // First, check if database already exists with any case
    const adminClient = await mongoose.connect('mongodb://127.0.0.1:27017/admin', {
      family: 4
    });
    
    const adminDb = adminClient.connection.db;
    const databases = await adminDb.admin().listDatabases();
    const existingDb = databases.databases.find(
      db => db.name.toLowerCase() === '12properties'.toLowerCase()
    );

    // Disconnect from admin database
    await mongoose.disconnect();

    if (existingDb) {
      console.log(`\nFound existing database: ${existingDb.name}`);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('\nThis will delete all existing properties and users. Continue? (y/n): ', resolve);
      });

      readline.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('\nInitialization cancelled.');
        process.exit(0);
      }

      // Connect to the existing database with correct case
      await mongoose.connect(`mongodb://127.0.0.1:27017/${existingDb.name}`, {
        family: 4
      });
    } else {
      // Connect to new database
      await mongoose.connect('mongodb://127.0.0.1:27017/12Properties', {
        family: 4
      });
    }

    console.log('Connected to MongoDB');

    // Clear existing data
    const existingUsers = await User.countDocuments();
    const existingProperties = await Property.countDocuments();
    
    if (existingUsers > 0 || existingProperties > 0) {
      console.log('\nExisting data found:');
      console.log(`- Users: ${existingUsers}`);
      console.log(`- Properties: ${existingProperties}`);
    }

    await Promise.all([
      Property.deleteMany({}),
      User.deleteMany({})
    ]);
    console.log('Cleared existing data');

    // Create admin user
    const admin = new User({
      name: 'Sarah Johnson',
      email: 'realtor@12mgt.com',
      password: 'password123',
      phone: '+1 (310) 555-0123',
      role: 'admin'
    });
    await admin.save();
    console.log('Created admin user');

    // Copy sample images
    const images = await copySampleImages();
    console.log('Copied sample images');

    // Create properties
    const propertyDocs = properties.map((prop, index) => ({
      ...prop,
      mainImage: images[index * 3],
      images: images.slice(index * 3, (index * 3) + 3),
      realtor: admin._id,
      status: ['Active', 'Pending', 'Active'][index]
    }));

    await Property.insertMany(propertyDocs);
    console.log('Created sample properties');

    console.log('Database initialization complete!');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await mongoose.disconnect();
  }
}

// Create sample-images directory structure
const createSampleImagesDir = async () => {
  const dir = path.join(__dirname, 'sample-images');
  const requiredImages = [
    'property1-main.jpg',
    'property1-2.jpg',
    'property1-3.jpg',
    'property2-main.jpg',
    'property2-2.jpg',
    'property2-3.jpg',
    'property3-main.jpg',
    'property3-2.jpg',
    'property3-3.jpg'
  ];
  
  try {
    await fs.mkdir(dir, { recursive: true });
    
    // Check which files exist
    const existingFiles = [];
    const missingFiles = [];
    
    for (const image of requiredImages) {
      try {
        await fs.access(path.join(dir, image));
        existingFiles.push(image);
      } catch {
        missingFiles.push(image);
      }
    }

    console.log('\nChecking for required images...');
    
    if (existingFiles.length > 0) {
      console.log('\nFound images:');
      existingFiles.forEach(file => console.log(`✓ ${file}`));
    }

    if (missingFiles.length > 0) {
      console.log('\nMissing images:');
      missingFiles.forEach(file => console.log(`✗ ${file}`));
      
      console.log('\nWould you like to:');
      console.log('1. Download missing images from Unsplash');
      console.log('2. Proceed with existing images only');
      console.log('3. Cancel initialization');
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('\nEnter your choice (1-3): ', resolve);
      });
      
      readline.close();

      switch (answer) {
        case '1':
          console.log('\nDownloading missing images...');
          const shouldProceed = await downloadMissingImages(missingFiles, dir);
          if (shouldProceed) {
            return true;
          }
          return false;
        case '2':
          if (existingFiles.length === 0) {
            console.log('\nNo images found. Cannot proceed without any images.');
            return false;
          }
          console.log('\nProceeding with existing images...');
          return true;
        default:
          console.log('\nInitialization cancelled.');
          return false;
      }
    } else {
      console.log('\nAll required images found! Proceeding with initialization...');
      return true;
    }
  } catch (err) {
    console.error('Error creating sample images directory:', err);
    return false;
  }
};

// Function to download images from Unsplash
async function downloadMissingImages(missingFiles, dir) {
  const https = require('https');
  const failedDownloads = [];
  const imageUrls = {
    'property1-main.jpg': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=2000&q=80',
    'property1-2.jpg': 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2000&q=80',
    'property1-3.jpg': 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=2000&q=80',
    'property2-main.jpg': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80',
    'property2-2.jpg': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=80',
    'property2-3.jpg': 'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?auto=format&fit=crop&w=2000&q=80',
    'property3-main.jpg': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80',
    'property3-2.jpg': 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=2000&q=80',
    'property3-3.jpg': 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=2000&q=80'
  };

  for (const file of missingFiles) {
    const url = imageUrls[file];
    const filePath = path.join(dir, file);
    
    console.log(`Downloading ${file}...`);
    
    try {
      await new Promise((resolve, reject) => {
        https.get(url, response => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download ${file}: ${response.statusCode}`));
            return;
          }
          
          const fileStream = fs.createWriteStream(filePath);
          response.pipe(fileStream);
          
          fileStream.on('finish', () => {
            fileStream.close();
            console.log(`✓ Downloaded ${file}`);
            resolve();
          });
        }).on('error', reject);
      });
    } catch (err) {
      console.error(`Error downloading ${file}:`, err.message);
      failedDownloads.push(file);
    }
  }

  if (failedDownloads.length > 0) {
    console.log('\nSome images failed to download:');
    failedDownloads.forEach(file => console.log(`✗ ${file}`));
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question('\nWould you like to proceed with the available images? (y/n): ', resolve);
    });

    readline.close();

    if (answer.toLowerCase() === 'y') {
      console.log('\nProceeding with available images...');
      return true;
    } else {
      console.log('\nInitialization cancelled.');
      return false;
    }
  }

  return true;
}

// Run initialization
if (require.main === module) {
  createSampleImagesDir()
    .then((shouldProceed) => {
      if (shouldProceed) {
        return initializeDatabase();
      } else {
        process.exit(0);
      }
    })
    .catch(console.error);
}

module.exports = { initializeDatabase }; 