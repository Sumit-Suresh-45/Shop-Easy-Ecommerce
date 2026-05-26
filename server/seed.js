require('dotenv').config();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { connectDB, sequelize } = require('./config/db');
const Product = require('./models/Product');
const User = require('./models/User');

const seed = async () => {
  try {
    await connectDB();
    await sequelize.sync({ force: false });
    console.log('🌱 Starting database seed...\n');

    // ─── Seed Products ──────────────────────────────────────────
    const productsPath = path.join(__dirname, '..', 'assets', 'data', 'products.json');
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

    let created = 0;
    let skipped = 0;

    for (const product of products) {
      const existing = await Product.findByPk(product.id);
      if (!existing) {
        await Product.create(product);
        created++;
        console.log(`  ✅ Added: ${product.title}`);
      } else {
        skipped++;
      }
    }

    console.log(`\n📦 Products: ${created} created, ${skipped} already existed.`);

    // ─── Seed Admin User ────────────────────────────────────────
    const adminEmail = 'admin@shopeasy.com';
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      console.log('\n👤 Admin user created:');
      console.log('   Email:    admin@shopeasy.com');
      console.log('   Password: admin123');
    } else {
      console.log('\n👤 Admin user already exists.');
    }

    console.log('\n✨ Database seeding complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
