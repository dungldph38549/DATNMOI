import axiosInstance from "../api/axiosConfig";

export const createOrder = async (data) => {
  // Reuse the shared axios instance so the baseURL/port matches the rest of FE.
  const res = await axiosInstance.post("/order", data);
  return res.data;
};