import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout = () => {
  const currUser = null;
  const handleLogout = () => console.log("Logout clicked");

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      <Navbar currUser={currUser} handleLogout={handleLogout} />

      <main className="grow pt-20">
        <Outlet />
      </main>

      <hr className="border-gray-800" />
      <Footer />
    </div>
  );
};

export default Layout;
