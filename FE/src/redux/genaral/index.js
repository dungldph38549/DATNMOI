import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  keyword: "",
};

const generalSlice = createSlice({
  name: "general",
  initialState,
  reducers: {
    changeKeyword: (state, action) => {
      state.keyword = action.payload;
    },
  },
});

export const { changeKeyword } = generalSlice.actions;

export default generalSlice.reducer;
