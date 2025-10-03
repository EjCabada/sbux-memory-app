import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App.jsx";
import Search from "./pages/Search.jsx";
import Home from "./pages/Home.jsx";
import BeginnerQuiz from "./pages/BeginnerQuiz.jsx";
import AdvancedQuiz from "./pages/AdvancedQuiz.jsx";
import Resources from "./pages/Resources.jsx"; // Import the new page

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "search",
        element: <Search />,
      },
      {
        path: "quiz/beginner",
        element: <BeginnerQuiz />,
      },
      {
        path: "quiz/advanced",
        element: <AdvancedQuiz />,
      },
      {
        path: "resources", // Add the new route
        element: <Resources />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);