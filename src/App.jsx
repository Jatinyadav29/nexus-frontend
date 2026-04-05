import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import Booking from "./pages/Booking";
import BookingList from "./pages/BookingList";
import Tournament from "./pages/Tournament";
import TournamentList from "./pages/TournamentList";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Payment from "./pages/Payment";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="booking" element={<Booking />} />
            <Route path="bookings" element={<BookingList />} />
            <Route path="tournament" element={<Tournament />} />
            <Route path="tournament/list" element={<TournamentList />} />
            <Route path="contact" element={<Contact />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="payment" element={<Payment />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
