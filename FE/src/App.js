import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { decrement, increment } from "./redux/counterSlice";
import styled from "styled-components";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ShoppingCartPage from "./pages/ShoppingCartPage/ShoppingCartPage";
import TermsConditionsPage from "./pages/TermsConditionsPage/TermsConditionsPage";
import HomePage from "./pages/HomePage/HomePage";


const Button = styled.button`
  color: grey;
`;


export function Counter() {
  const count = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();

  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<HomePage />} />
        
        <Route path="/cart" element={<ShoppingCartPage />} />

        <Route path="/terms" element={<TermsConditionsPage />} />
      </Routes>
      
    </BrowserRouter>
  );
}
export default Counter;
