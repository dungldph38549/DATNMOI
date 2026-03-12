import axios from "axios";

const createOrder = async (data) => {
  const res = await axios.post(
    "http://localhost:3001/api/order/create",
    data
  );
  return res.data;
};

export default createOrder;