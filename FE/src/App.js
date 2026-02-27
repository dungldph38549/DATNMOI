import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { decrement, increment } from "./redux/counterSlice";
import styled from "styled-components";

export function Counter() {
  const count = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();
  const Button = styled.button`
    color: grey;
  `;

  return (
    <div>
      <div>
        <Button onClick={() => dispatch(increment())}>Increment</Button>

        <span>{count}</span>

        <Button onClick={() => dispatch(decrement())}>Decrement</Button>
      </div>
    </div>
  );
}
