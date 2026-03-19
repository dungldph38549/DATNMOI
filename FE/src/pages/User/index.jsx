import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./User.css";

// Backend admin endpoints: /api/user/*
const API_BASE = "http://localhost:3002/api/user";

const getAuthToken = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || parsed?.access_token || parsed?.accessToken || null;
  } catch {
    return null;
  }
};

function UserPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    phone: "",
  });

  const [editingId, setEditingId] = useState(null);

  // lấy danh sách user
  const fetchUsers = async () => {
    setErrorMsg("");
    const token = getAuthToken();
    if (!token) {
      setErrorMsg("Bạn cần đăng nhập để truy cập trang quản lý người dùng.");
      navigate("/login");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/all?page=0&limit=1000`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          payload?.message || payload?.error || "Không thể tải danh sách người dùng";
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("user");
          setErrorMsg("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
          navigate("/login");
          return;
        }
        throw new Error(msg);
      }
      // listUser: data = { data: [...], total, page, limit, pages }
      // getAllUser: data = [...]
      const list = Array.isArray(payload?.data)
        ? payload.data
        : payload?.data?.data || [];
      setUsers(list);
    } catch (error) {
      setErrorMsg(error?.message || "Lỗi khi tải danh sách người dùng");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // thay đổi input
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = getAuthToken();
      if (!token) {
        setErrorMsg("Bạn cần đăng nhập để thực hiện thao tác này.");
        navigate("/login");
        return;
      }
      const options = {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      };

      const url = editingId
        ? `${API_BASE}/admin/${editingId}`
        : `${API_BASE}/admin`;
      const res = await fetch(url, options);

      if (!res.ok) {
        const raw = await res.json().catch(() => null);
        const msg = raw?.message || "Không thể lưu thông tin người dùng";
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("user");
          setErrorMsg("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
          navigate("/login");
          return;
        }
        throw new Error(msg);
      }

      setEditingId(null);

      // reset form
      setForm({
        name: "",
        email: "",
        password: "",
        role: "user",
        phone: "",
      });

      fetchUsers();
    } catch (error) {
      setErrorMsg(error?.message || "Lỗi khi lưu thông tin người dùng");
    }
  };

  // xóa user
  const handleDelete = async (id) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setErrorMsg("Bạn cần đăng nhập để thực hiện thao tác này.");
        navigate("/login");
        return;
      }
      const res = await fetch(`${API_BASE}/admin/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const raw = await res.json().catch(() => null);
        const msg = raw?.message || "Không thể xóa người dùng";
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("user");
          setErrorMsg("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
          navigate("/login");
          return;
        }
        throw new Error(msg);
      }
      fetchUsers();
    } catch (error) {
      setErrorMsg(error?.message || "Lỗi khi xóa người dùng");
    }
  };

  // sửa user
  const handleEdit = (user) => {
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.isAdmin ? "admin" : "user",
      phone: user.phone || "",
    });

    setEditingId(user._id);
  };

  return (
    <div className="admin-users">
      <h2>Quản lý người dùng</h2>
      {errorMsg && (
        <p className="role-user" style={{ color: "#dc2626", fontWeight: 600 }}>
          {errorMsg}
        </p>
      )}

      <form onSubmit={handleSubmit} className="user-form">
        <input
          name="name"
          placeholder="Tên"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required={!editingId}
        />

        <input
          name="phone"
          placeholder="Số điện thoại"
          value={form.phone}
          onChange={handleChange}
        />

        <select name="role" value={form.role} onChange={handleChange}>
          <option value="user">Người dùng</option>
          <option value="admin">Quản trị viên</option>
        </select>

        <button type="submit" className="btn-submit">
          {editingId ? "Cập nhật" : "Thêm"}
        </button>
      </form>

      <table className="user-table">
        <thead>
          <tr>
            <th>Tên</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.phone}</td>

              <td>
                <span
                  className={`role-badge ${
                    u.isAdmin ? "role-admin" : "role-user"
                  }`}
                >
                  {u.isAdmin ? "Quản trị viên" : "Người dùng"}
                </span>
              </td>

              <td>
                <button
                  className="action-btn btn-edit"
                  onClick={() => handleEdit(u)}
                >
                  Sửa
                </button>

                <button
                  className="action-btn btn-delete"
                  onClick={() => handleDelete(u._id)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserPage;