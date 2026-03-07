import React, { useEffect, useState } from "react";
import "./User.css";

const API = "http://localhost:3001/api/users";

function UserPage() {
  const [users, setUsers] = useState([]);
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
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error("Không thể tải danh sách người dùng");
      const data = await res.json();
      setUsers(data.data || data);
    } catch (error) {
      console.log("GET ERROR:", error);
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
      const options = {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      };

      const url = editingId ? `${API}/${editingId}` : API;
      const res = await fetch(url, options);

      if (!res.ok) {
        throw new Error("Không thể lưu thông tin người dùng");
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
      console.log("SUBMIT ERROR:", error);
    }
  };

  // xóa user
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Không thể xóa người dùng");
      fetchUsers();
    } catch (error) {
      console.log("DELETE ERROR:", error);
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
      <h2>Quản lý User</h2>

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
          <option value="user">User</option>
          <option value="admin">Admin</option>
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
                  {u.isAdmin ? "admin" : "user"}
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