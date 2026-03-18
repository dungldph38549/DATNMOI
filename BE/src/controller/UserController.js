const User = require("../model/UserModel");
const UserService = require("../services/UserService");


// ================== GET ALL ==================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("GET ALL ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


// ================== GET BY ID ==================
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("GET BY ID ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


// ================== CREATE ==================
exports.createUser = async (req, res) => {
  try {
    console.log("BODY NHẬN ĐƯỢC:", req.body);

    const { name, email, password, role, phone } = req.body;

    // check thiếu dữ liệu
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // check email tồn tại
    const existEmail = await User.findOne({ email });
    if (existEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const newUser = new User({
      name,
      email,
      password,
      phone,
      isAdmin: role === "admin" ? true : false
    });

    const savedUser = await newUser.save();

    res.status(201).json(savedUser);
  } catch (error) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


// ================== UPDATE ==================
exports.updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


// ================== DELETE ==================
exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};



// ================== GET ALL ==================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("GET ALL ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


// ================== GET BY ID ==================
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("GET BY ID ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


// ================== CREATE ==================
exports.createUser = async (req, res) => {
  try {
    console.log("BODY NHẬN ĐƯỢC:", req.body);

    const { name, email, password, role, phone } = req.body;

    // check thiếu dữ liệu
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // check email tồn tại
    const existEmail = await User.findOne({ email });
    if (existEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const newUser = new User({
      name,
      email,
      password,
      phone,
      isAdmin: role === "admin" ? true : false
    });

    const savedUser = await newUser.save();

    res.status(201).json(savedUser);
  } catch (error) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


// ================== UPDATE ==================
exports.updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


// ================== DELETE ==================
exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================== REGISTER ==================
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        status: "ERR",
        message: "Vui lòng điền đầy đủ: Họ tên, Email, Mật khẩu, Số điện thoại",
      });
    }

    const result = await UserService.registerUser({ name, email, password, phone });
    return res.status(201).json(result);
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    if (error && error.status) {
      return res.status(error.status).json({
        status: "ERR",
        message: error.message || "Đăng ký thất bại",
      });
    }
    return res.status(500).json({
      status: "ERR",
      message: error?.message || "Lỗi server khi đăng ký",
    });
  }
};

// ================== LOGIN ==================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: "ERR",
        message: "Vui lòng nhập email và mật khẩu",
      });
    }

    const result = await UserService.loginUser({ email, password });

    return res.status(200).json(result);
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    if (error && error.status) {
      return res.status(error.status).json({
        status: "ERR",
        message: error.message || "Đăng nhập thất bại",
      });
    }
    return res.status(500).json({
      status: "ERR",
      message: error?.message || "Lỗi server khi đăng nhập",
    });
  }
};

// ================== LOGOUT ==================
exports.logout = async (req, res) => {
  try {
    res.json({ message: "Logout success" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================== REFRESH TOKEN ==================
exports.refreshToken = async (req, res) => {
  try {
    res.json({ message: "Refresh token success" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================== GET DETAILS ==================
exports.getDetailsUser = async (req, res) => {
  try {
    res.json({ message: "User details API working" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================== GOOGLE LOGIN ==================
exports.googleCallback = async (req, res) => {
  try {
    res.json({ message: "Google login API working" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};