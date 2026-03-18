import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { store } from "./redux/store";
import { Provider } from "react-redux";

// 1. Import QueryClient và QueryClientProvider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "antd/dist/reset.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./assets/css/bootstrap.min.css";
import "./assets/css/font-awesome.css";
import "./assets/css/animate.min.css";
import "./assets/css/owl.carousel.css";
import "./assets/css/owl.transitions.css";
import "./assets/css/bootstrap-select.min.css";
import "./assets/css/lightbox.css";
import "./assets/css/rateit.css";
import "./assets/css/blue.css";
import "./assets/css/main.css";

// 2. Khởi tạo instance của QueryClient
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        {/* 3. Bọc QueryClientProvider bên ngoài App */}
        <App />
      </Provider>
    </QueryClientProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
