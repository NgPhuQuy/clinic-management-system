import { createContext, useContext } from "react";

export const MyUserContext = createContext(null);
export const MyDispatchContext = createContext(null);

export const useUser = () => useContext(MyUserContext);
export const useDispatch = () => useContext(MyDispatchContext);

export const MyReducer = (current, action) => {
    switch (action.type) {
        case "login":
            return action.payload;
        case "logout":
            return null;
        default:
            return current;
    }
};
