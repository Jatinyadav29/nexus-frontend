import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-900 py-12 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gray-900"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4" data-aos="fade-up">
            <h4 className="text-xl font-bold gradient-text">NEXUS</h4>
            <p className="text-gray-400">
              Premier gaming destination offering cutting-edge technology and
              immersive experiences.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-400 hover:text-purple-500 transition-colors transform hover:scale-110"
              >
                <i className="fab fa-facebook-f"></i>
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-purple-500 transition-colors transform hover:scale-110"
              >
                <i className="fab fa-twitter"></i>
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-purple-500 transition-colors transform hover:scale-110"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-purple-500 transition-colors transform hover:scale-110"
              >
                <i className="fab fa-discord"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div data-aos="fade-up" data-aos-delay="100">
            <h4 className="text-xl font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-gray-400 hover:text-purple-500 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <a
                  href="#about"
                  className="text-gray-400 hover:text-purple-500 transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#games"
                  className="text-gray-400 hover:text-purple-500 transition-colors"
                >
                  Games
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-gray-400 hover:text-purple-500 transition-colors"
                >
                  Pricing
                </a>
              </li>
              <li>
                <Link
                  to="/tournament/list"
                  className="text-gray-400 hover:text-purple-500 transition-colors"
                >
                  Tournaments
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div data-aos="fade-up" data-aos-delay="200">
            <h4 className="text-xl font-bold mb-4">Services</h4>
            <ul className="space-y-2">
              <li className="text-gray-400 flex items-center">
                <i className="fas fa-check text-purple-500 mr-2"></i> Gaming PCs
              </li>
              <li className="text-gray-400 flex items-center">
                <i className="fas fa-check text-purple-500 mr-2"></i> VR
                Experience
              </li>
              <li className="text-gray-400 flex items-center">
                <i className="fas fa-check text-purple-500 mr-2"></i> Esports
                Tournaments
              </li>
              <li className="text-gray-400 flex items-center">
                <i className="fas fa-check text-purple-500 mr-2"></i> Private
                Rooms
              </li>
              <li className="text-gray-400 flex items-center">
                <i className="fas fa-check text-purple-500 mr-2"></i> Food &
                Beverages
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div data-aos="fade-up" data-aos-delay="300">
            <h4 className="text-xl font-bold mb-4">Newsletter</h4>
            <p className="text-gray-400 mb-4">
              Subscribe to our newsletter for updates and special offers.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Your email"
                className="bg-gray-800 border border-gray-700 rounded-l-lg px-4 py-2 focus:outline-none focus:border-purple-500 w-full"
              />
              <button className="bg-purple-600 hover:bg-purple-700 px-4 rounded-r-lg transition-colors">
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>

        <div
          className="border-t border-gray-800 pt-8 text-center"
          data-aos="fade-up"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400">
              &copy; 2026 Nexus Gaming Cafe. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-400 hover:text-purple-500 transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-purple-500 transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-purple-500 transition-colors"
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
