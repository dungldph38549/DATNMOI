
const express = require('express');
const router = express.Router();
const CategoryController = require('../controller/CategoryController');

// Các route CRUD cho Category
router.post('/', CategoryController.createCategory); // Tạo danh mục
router.get('/', CategoryController.getCategories); // Lấy tất cả danh mục
router.get('/:id', CategoryController.getCategoryById); // Lấy danh mục theo ID
router.put('/:id', CategoryController.updateCategory); // Cập nhật danh mục
router.delete('/:id', CategoryController.deleteCategory); // Xóa danh mục

module.exports = router;