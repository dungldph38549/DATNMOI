import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { store } from "./redux/store";
import { Provider } from "react-redux";
import { ConfigProvider } from "antd";

// 1. Import QueryClient và QueryClientProvider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


// 2. Khởi tạo instance của QueryClient
const queryClient = new QueryClient();

const googleSans =
  '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          fontFamily: googleSans,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          {/* 3. Bọc QueryClientProvider bên ngoài App */}
          <App />
        </Provider>
      </QueryClientProvider>
    </ConfigProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
