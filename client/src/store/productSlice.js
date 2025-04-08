import { createSlice } from "@reduxjs/toolkit";

const initialValue = {
    allCategory: [],
    loadingCategory: false,
    allSubCategory: [],
    product: [],
    loyaltyPoints: 0,
    loyaltyClass: "Basic"
};

const productSlice = createSlice({
    name: 'product',
    initialState: initialValue,
    reducers: {
        setAllCategory: (state, action) => {
            state.allCategory = [...action.payload];
        },
        setLoadingCategory: (state, action) => {
            state.loadingCategory = action.payload;
        },
        setAllSubCategory: (state, action) => {
            state.allSubCategory = [...action.payload];
        },
        setLoyaltyDetails: (state, action) => {
            state.loyaltyPoints = action.payload.points;
            state.loyaltyClass = action.payload.class;
        }
    }
});

export const { setAllCategory, setAllSubCategory, setLoadingCategory, setLoyaltyDetails } = productSlice.actions;

export default productSlice.reducer;