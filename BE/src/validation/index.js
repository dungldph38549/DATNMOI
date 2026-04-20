const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const routes = require("./routes");
const router = express.Router();
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Dùng router chứa các route upload
app.use(router); // ✅ Quan trọng!

// Dùng router chung nếu có routes khác
routes(app);

// Cho phép truy cập thư mục public
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Thư mục lưu trữ ảnh upload
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// ✅ Upload 1 ảnh
router.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Không có file được tải lên" });
  const filePath = `${req.file.filename}`;
  res.status(200).json({ message: "Tải lên thành công", path: filePath });
});

// ✅ Upload nhiều ảnh
router.post("/api/uploads/multiple", upload.array("files", 10), (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ message: "Không có ảnh nào được tải lên" });
  const filePaths = req.files.map((file) => `${file.filename}`);
  res.status(200).json({ message: "Tải lên thành công", paths: filePaths });
});

router.get("/api/image/:filename", (req, res) => {
  const { filename } = req.params;
  if (!filename) {
    return res.status(400).json({ message: "Thiếu tên file" });
  }
  const filePath = path.join(__dirname, "../public/uploads", filename);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ message: "Ảnh không tồn tại" });
    }
    res.sendFile(filePath);
  });
});

// MongoDB connect
mongoose
  .connect(process.env.MONGO_DB)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
