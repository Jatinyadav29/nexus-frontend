import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Context se data aur function nikal rahe hain
  const { currUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login"); // Logout hone ke baad login page par bhejo
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <nav className="fixed w-full z-50 transition-all duration-300 bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-bold gradient-text hover:scale-105 transition-transform"
          >
            NEXUS
          </Link>
          <div className="hidden md:flex space-x-8 items-center">
            <Link
              to="/"
              className="nav-link text-gray-300 hover:text-purple-400"
            >
              Home
            </Link>
            <Link
              to="/bookings"
              className="nav-link text-gray-300 hover:text-purple-400"
            >
              Booking
            </Link>
            <Link
              to="/tournament/list"
              className="nav-link text-gray-300 hover:text-purple-400"
            >
              Tournaments
            </Link>
            <Link
              to="/gallery"
              className="nav-link text-gray-300 hover:text-purple-400"
            >
              Gallery
            </Link>
            <Link
              to="/contact"
              className="nav-link text-gray-300 hover:text-purple-400"
            >
              Contact
            </Link>

            {/* Conditional Rendering */}
            {!currUser ? (
              <div className="flex space-x-4">
                <Link
                  to="/register"
                  className="bg-transparent border border-purple-500 text-purple-400 px-4 py-2 rounded-lg hover:bg-purple-500 hover:text-white transition"
                >
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                >
                  Login
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-purple-400 font-semibold">
                  Hi, {currUser.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            onClick={toggleMenu}
            className="md:hidden text-xl hover:text-purple-500 transition-colors focus:outline-none text-white"
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`${isMobileMenuOpen ? "block" : "hidden"} absolute w-full bg-gray-800/95 backdrop-blur-sm md:hidden`}
      >
        <div className="px-6 py-4 flex flex-col space-y-4">
          <Link to="/" className="nav-link text-gray-300" onClick={toggleMenu}>
            Home
          </Link>
          <Link
            to="/bookings"
            className="nav-link text-gray-300"
            onClick={toggleMenu}
          >
            Booking
          </Link>
          <Link
            to="/tournament/list"
            className="nav-link text-gray-300"
            onClick={toggleMenu}
          >
            Tournaments
          </Link>
          <Link
            to="/gallery"
            className="nav-link text-gray-300"
            onClick={toggleMenu}
          >
            Gallery
          </Link>
          <Link
            to="/contact"
            className="nav-link text-gray-300"
            onClick={toggleMenu}
          >
            Contact
          </Link>
          {!currUser ? (
            <Link
              to="/login"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-center"
              onClick={toggleMenu}
            >
              Sign Up / Login
            </Link>
          ) : (
            <button
              onClick={() => {
                handleLogout();
                toggleMenu();
              }}
              className="text-left text-red-500 font-semibold"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
