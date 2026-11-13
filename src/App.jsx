import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import "./App.css";

function App() {
  const { pathname } = useLocation();

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content">
        <div key={pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
