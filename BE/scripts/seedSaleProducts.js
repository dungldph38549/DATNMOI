const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Product = require('../src/models/ProductModel');
const Brand = require('../src/models/BrandModel');
const Category = require('../src/models/CategoryModel');

const seedSaleProducts = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_DB);
        console.log('Connected!');

        // Get or Create Brand/Category
        let brand = await Brand.findOne({ name: 'NIKE' });
        if (!brand) brand = await Brand.create({ name: 'NIKE', status: 'active' });

        let category = await Category.findOne({ name: 'Sneakers' });
        if (!category) category = await Category.create({ 
            name: 'Sneakers', 
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff', 
            status: 'active' 
        });

        const saleProducts = [
            {
                name: "NIKE AIR MAX 270 'RE-FRESH SALE'",
                description: "Siêu phẩm Nike Air Max 270 với đệm khí êm ái, nay có mức giá sale cực sốc dành riêng cho fan SneakerHouse.",
                shortDescription: "Giày chạy bộ thời trang Nike Air Max 270 - Sale 50%",
                brandId: brand._id,
                categoryId: category._id,
                image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
                srcImages: [
                    "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
                    "https://images.unsplash.com/photo-1512374382149-4332c6c02151"
                ],
                price: 2400000, 
                originalPrice: 4800000,
                isSale: true,
                discountPercentage: 50,
                stock: 100,
                gender: "unisex",
                style: "lifestyle",
                isVisible: true,
                isFeatured: true,
                tags: ["sale", "nike", "airmax"]
            },
            {
                name: "ADIDAS ULTRABOOST 22 'BLACK DIAMOND'",
                description: "Trải nghiệm nguồn năng lượng bùng nổ với Ultraboost 22. Phiên bản Black Diamond sang trọng.",
                shortDescription: "Adidas Ultraboost 22 - Phiên bản giới hạn sale",
                brandId: brand._id,
                categoryId: category._id,
                image: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb",
                srcImages: [
                    "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb",
                    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a"
                ],
                price: 2500000,
                originalPrice: 5000000,
                isSale: true,
                discountPercentage: 50,
                stock: 50,
                gender: "unisex",
                style: "running",
                isVisible: true,
                isFeatured: true,
                tags: ["sale", "adidas", "ultraboost"]
            },
            {
                name: "CONVERSE CHUCK 70 'SUNFLOWER' SPECIAL",
                description: "Mẫu giày Converse Chuck 70 màu Sunflower rực rỡ, mang phong cách cổ điển vượt thời gian.",
                shortDescription: "Converse Chuck 70 Sunflower - Sale Shock",
                brandId: brand._id,
                categoryId: category._id,
                image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d",
                srcImages: [
                    "https://images.unsplash.com/photo-1491553895911-0055eca6402d"
                ],
                price: 900000,
                originalPrice: 1800000,
                isSale: true,
                discountPercentage: 50,
                stock: 200,
                gender: "unisex",
                style: "lifestyle",
                isVisible: true,
                isFeatured: true,
                tags: ["sale", "converse", "chuck 70"]
            },
            {
                name: "JORDAN 1 LOW 'PANDA' PRO SALE",
                description: "Phối màu Panda quốc dân trên dòng Jordan 1 Low, đảm bảo bạn sẽ nổi bật ở bất cứ đâu.",
                shortDescription: "Jordan 1 Low Panda - Giá hời chưa từng có",
                brandId: brand._id,
                categoryId: category._id,
                image: "https://images.unsplash.com/photo-1597042220235-983050016a67",
                srcImages: [
                    "https://images.unsplash.com/photo-1597042220235-983050016a67"
                ],
                price: 3200000,
                originalPrice: 6400000,
                isSale: true,
                discountPercentage: 50,
                stock: 80,
                gender: "unisex",
                style: "basketball",
                isVisible: true,
                isFeatured: true,
                tags: ["sale", "jordan", "panda"]
            }
        ];

        console.log('Seeding products...');
        for (const p of saleProducts) {
            const existing = await Product.findOne({ name: p.name });
            if (existing) {
                console.log(`Updating existing product: ${p.name}`);
                await Product.findByIdAndUpdate(existing._id, p);
            } else {
                console.log(`Creating new product: ${p.name}`);
                await Product.create(p);
            }
        }

        console.log('Seeding completed successfully!');
        process.exit();
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
};

seedSaleProducts();
