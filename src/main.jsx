import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { DrinkProvider } from "./context/DrinkContext.jsx";
import App from "./App.jsx";
import Search from "./pages/Search.jsx";
import Home from "./pages/Home.jsx";
import BeginnerQuiz from "./pages/BeginnerQuiz.jsx";
import HotBarFlashcards from "./pages/HotBarFlashcards.jsx";
import AdvancedQuiz from "./pages/AdvancedQuiz.jsx";
import Resources from "./pages/Resources.jsx";
import SequencingQuiz from "./pages/SequencingQuiz.jsx";
import DrinkManager from "./pages/DrinkManager.jsx";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "search", element: <Search /> },
      { path: "quiz/flashcards", element: <HotBarFlashcards /> },
      { path: "quiz/beginner", element: <BeginnerQuiz /> },
      { path: "quiz/sequencing", element: <SequencingQuiz /> },
      { path: "quiz/advanced", element: <AdvancedQuiz /> },
      { path: "manager", element: <DrinkManager /> },
      { path: "resources", element: <Resources /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DrinkProvider>
      <RouterProvider router={router} />
    </DrinkProvider>
  </React.StrictMode>
);
