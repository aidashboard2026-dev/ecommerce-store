import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isOffline: false,
};

const networkSlice = createSlice({
  name: "network",

  initialState,

  reducers: {
    setOffline(state) {
      state.isOffline = true;
    },

    setOnline(state) {
      state.isOffline = false;
    },
  },
});

export const { setOffline, setOnline } = networkSlice.actions;

export default networkSlice.reducer;